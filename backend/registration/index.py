import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime
import random
import string
import requests
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление задачами регистрации
    Args: event с httpMethod, body, queryStringParameters
    Returns: HTTP response с данными задач
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute('''
            SELECT 
                rt.id, rt.status, rt.marktplaats_login, rt.error_message, rt.created_at, rt.completed_at,
                ga.email, p.host, p.port, rt.logs
            FROM t_p24911867_account_registration.registration_tasks rt
            LEFT JOIN t_p24911867_account_registration.google_accounts ga ON rt.google_account_id = ga.id
            LEFT JOIN t_p24911867_account_registration.proxies p ON rt.proxy_id = p.id
            ORDER BY rt.created_at DESC
        ''')
        rows = cur.fetchall()
        tasks = [
            {
                'id': row[0],
                'status': row[1],
                'marktplaatsLogin': row[2],
                'errorMessage': row[3],
                'createdAt': row[4].isoformat(),
                'completedAt': row[5].isoformat() if row[5] else None,
                'email': row[6],
                'proxy': f'{row[7]}:{row[8]}' if row[7] else None,
                'logs': row[9]
            }
            for row in rows
        ]
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'tasks': tasks})
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'delete':
            task_id = body_data.get('taskId')
            if task_id:
                cur.execute('DELETE FROM t_p24911867_account_registration.registration_tasks WHERE id = %s', (task_id,))
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True})
                }
        
        if action == 'delete_all':
            cur.execute('DELETE FROM t_p24911867_account_registration.registration_tasks')
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'success': True})
            }
        
        if action == 'start':
            cur.execute('''
                SELECT ga.id, p.id 
                FROM t_p24911867_account_registration.google_accounts ga
                CROSS JOIN t_p24911867_account_registration.proxies p
                WHERE (ga.status = 'active' OR ga.status = 'ready')
                AND p.status = 'active'
                AND NOT EXISTS (
                    SELECT 1 FROM t_p24911867_account_registration.registration_tasks rt 
                    WHERE rt.google_account_id = ga.id 
                    AND rt.status IN ('waiting', 'processing', 'completed')
                )
                AND NOT EXISTS (
                    SELECT 1 FROM t_p24911867_account_registration.registration_tasks rt 
                    WHERE rt.proxy_id = p.id 
                    AND rt.status IN ('waiting', 'processing', 'completed')
                )
                LIMIT 10
            ''')
            pairs = cur.fetchall()
            
            for google_id, proxy_id in pairs:
                marktplaats_login = generate_username()
                marktplaats_password = generate_password()
                cur.execute(
                    'INSERT INTO t_p24911867_account_registration.registration_tasks (google_account_id, proxy_id, marktplaats_login, marktplaats_password) VALUES (%s, %s, %s, %s)',
                    (google_id, proxy_id, marktplaats_login, marktplaats_password)
                )
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'tasksCreated': len(pairs)})
            }
        
        if action == 'process':
            cur.execute('''
                SELECT rt.id, rt.google_account_id, rt.proxy_id, rt.marktplaats_login, rt.marktplaats_password,
                       ga.email, ga.password, p.host, p.port, p.username, p.password
                FROM t_p24911867_account_registration.registration_tasks rt
                JOIN t_p24911867_account_registration.google_accounts ga ON rt.google_account_id = ga.id
                JOIN t_p24911867_account_registration.proxies p ON rt.proxy_id = p.id
                WHERE rt.status = 'waiting'
                ORDER BY rt.created_at ASC
                LIMIT 1
            ''')
            
            task_row = cur.fetchone()
            
            if not task_row:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'message': 'No tasks to process'})
                }
            
            task_id, google_account_id, proxy_id, marktplaats_login, marktplaats_password, \
            google_email, google_password, proxy_host, proxy_port, proxy_username, proxy_password = task_row
            
            cur.execute('UPDATE t_p24911867_account_registration.registration_tasks SET status = %s WHERE id = %s', 
                       ('processing', task_id))
            conn.commit()
            
            try:
                result = process_registration_real(
                    google_email, google_password,
                    proxy_host, proxy_port, proxy_username, proxy_password,
                    marktplaats_login, marktplaats_password
                )
                
                logs_json = json.dumps(result.get('logs', []))
                
                if result['success']:
                    cur.execute('''
                        UPDATE t_p24911867_account_registration.registration_tasks 
                        SET status = %s, completed_at = %s, cookies_data = %s, logs = %s 
                        WHERE id = %s
                    ''', ('completed', datetime.utcnow(), result.get('cookies'), logs_json, task_id))
                else:
                    cur.execute('''
                        UPDATE t_p24911867_account_registration.registration_tasks 
                        SET status = %s, error_message = %s, attempts = attempts + 1, logs = %s 
                        WHERE id = %s
                    ''', ('failed', result.get('error', 'Unknown error'), logs_json, task_id))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps(result)
                }
                
            except Exception as e:
                cur.execute('''
                    UPDATE t_p24911867_account_registration.registration_tasks 
                    SET status = %s, error_message = %s, attempts = attempts + 1 
                    WHERE id = %s
                ''', ('failed', str(e)[:500], task_id))
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': str(e)})
                }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }


def generate_username() -> str:
    return 'user_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


def generate_password() -> str:
    return ''.join(random.choices(string.ascii_letters + string.digits, k=12))


def process_registration_real(google_email: str, google_password: str, 
                              proxy_host: str, proxy_port: str, proxy_username: str, proxy_password: str,
                              marktplaats_login: str, marktplaats_password: str) -> Dict[str, Any]:
    logs = []
    driver = None
    
    def add_log(step: str, message: str):
        logs.append(f"[{step}] {message}")
        print(f"LOG: [{step}] {message}")
    
    try:
        add_log("INIT", f"Начало регистрации для {google_email} через {proxy_host}:{proxy_port}")
        
        browserless_key = os.environ.get('BROWSERLESS_API_KEY')
        if not browserless_key:
            add_log("ERROR", "API ключ Browserless не найден")
            return {
                'success': False,
                'error': 'BROWSERLESS_API_KEY не настроен в секретах',
                'logs': logs
            }
        
        add_log("BROWSERLESS", "Подключение к удаленному браузеру")
        
        if proxy_username and proxy_password:
            proxy_str = f'{proxy_username}:{proxy_password}@{proxy_host}:{proxy_port}'
            add_log("BROWSERLESS", f"Прокси с авторизацией: {proxy_host}:{proxy_port}")
        else:
            proxy_str = f'{proxy_host}:{proxy_port}'
            add_log("BROWSERLESS", f"Прокси без авторизации: {proxy_host}:{proxy_port}")
        
        chrome_options = webdriver.ChromeOptions()
        chrome_options.set_capability('browserless:token', browserless_key)
        chrome_options.add_argument(f'--proxy-server=socks5://{proxy_str}')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.set_capability('goog:chromeOptions', {'prefs': {'profile.default_content_setting_values': {'notifications': 2}}})
        
        add_log("BROWSERLESS", "Создание WebDriver сессии")
        
        driver = webdriver.Remote(
            command_executor='https://chrome.browserless.io/webdriver',
            options=chrome_options
        )
        
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
            '''
        })
        
        driver.set_page_load_timeout(90)
        wait = WebDriverWait(driver, 30)
        
        add_log("BROWSER", "Браузер запущен успешно")
        
        add_log("GOOGLE", "Переход на страницу входа Google")
        driver.get('https://accounts.google.com/signin')
        time.sleep(random.uniform(3, 6))
        
        add_log("GOOGLE", "Ввод email")
        email_input = wait.until(EC.presence_of_element_located((By.ID, 'identifierId')))
        for char in google_email:
            email_input.send_keys(char)
            time.sleep(random.uniform(0.1, 0.3))
        time.sleep(random.uniform(1.5, 2.5))
        
        add_log("GOOGLE", "Клик на кнопку 'Далее'")
        next_button = driver.find_element(By.ID, 'identifierNext')
        next_button.click()
        time.sleep(random.uniform(3, 5))
        
        try:
            add_log("GOOGLE", "Ожидание поля пароля")
            password_input = wait.until(EC.presence_of_element_located((By.NAME, 'Passwd')))
            
            add_log("GOOGLE", "Ввод пароля")
            password_input.send_keys(google_password)
            time.sleep(random.uniform(1, 2))
            
            add_log("GOOGLE", "Клик на кнопку входа")
            password_next = driver.find_element(By.ID, 'passwordNext')
            password_next.click()
            time.sleep(random.uniform(4, 6))
            add_log("GOOGLE", "Успешный вход в Google")
        except TimeoutException:
            add_log("ERROR", "Google требует 2FA или капчу")
            driver.quit()
            return {
                'success': False,
                'error': 'Google требует дополнительную проверку (2FA/капча)',
                'logs': logs
            }
        
        add_log("MARKTPLAATS", "Переход на Marktplaats.nl")
        driver.get('https://www.marktplaats.nl')
        time.sleep(random.uniform(3, 5))
        
        try:
            add_log("MARKTPLAATS", "Поиск кнопки входа")
            login_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Inloggen')] | //a[contains(text(), 'Inloggen')]")))
            add_log("MARKTPLAATS", "Клик на кнопку входа")
            login_btn.click()
            time.sleep(random.uniform(2, 3))
        except:
            add_log("MARKTPLAATS", "Кнопка входа не найдена, возможно уже авторизован")
        
        try:
            add_log("MARKTPLAATS", "Поиск кнопки 'Войти через Google'")
            google_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Google')] | //*[contains(@aria-label, 'Google')]")))
            add_log("MARKTPLAATS", "Клик на кнопку Google")
            google_btn.click()
            time.sleep(random.uniform(5, 7))
            add_log("MARKTPLAATS", "Авторизация через Google завершена")
        except TimeoutException:
            add_log("ERROR", "Кнопка Google не найдена на Marktplaats")
            driver.quit()
            return {
                'success': False,
                'error': 'Не найдена кнопка входа через Google',
                'logs': logs
            }
        
        add_log("SUCCESS", "Получение cookies")
        cookies = driver.get_cookies()
        cookies_json = json.dumps(cookies)
        
        current_url = driver.current_url
        page_title = driver.title
        
        add_log("SUCCESS", f"Регистрация завершена. URL: {current_url}")
        
        driver.quit()
        
        return {
            'success': True,
            'cookies': cookies_json,
            'url': current_url,
            'title': page_title,
            'message': f'Регистрация завершена успешно через {proxy_host}:{proxy_port}',
            'logs': logs
        }
        
    except TimeoutException:
        add_log("ERROR", "Timeout при ожидании элемента")
        if driver:
            driver.quit()
        return {
            'success': False,
            'error': 'Timeout: элемент не найден или страница не загрузилась',
            'logs': logs
        }
    except Exception as e:
        add_log("ERROR", f"Исключение: {str(e)[:200]}")
        if driver:
            try:
                driver.quit()
            except:
                pass
        
        error_msg = str(e)
        if 'net::ERR_PROXY_CONNECTION_FAILED' in error_msg or 'NS_ERROR_PROXY_CONNECTION_REFUSED' in error_msg:
            return {
                'success': False,
                'error': f'Proxy error: не удалось подключиться к {proxy_host}:{proxy_port}',
                'logs': logs
            }
        elif 'net::ERR_TIMED_OUT' in error_msg or 'Timeout' in error_msg:
            return {
                'success': False,
                'error': f'Timeout: прокси {proxy_host}:{proxy_port} не отвечает',
                'logs': logs
            }
        else:
            return {
                'success': False,
                'error': f'Error: {error_msg[:250]}',
                'logs': logs
            }