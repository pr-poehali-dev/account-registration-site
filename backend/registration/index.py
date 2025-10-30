import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime
import random
import string
import requests
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

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
    
    def add_log(step: str, message: str):
        logs.append(f"[{step}] {message}")
        print(f"LOG: [{step}] {message}")
    
    try:
        add_log("INIT", f"Начало регистрации для {google_email} через {proxy_host}:{proxy_port}")
        
        if proxy_username and proxy_password:
            proxy_config = {
                'server': f'socks5://{proxy_host}:{proxy_port}',
                'username': proxy_username,
                'password': proxy_password
            }
            add_log("PROXY", f"Подключение через прокси с авторизацией")
        else:
            proxy_config = {
                'server': f'socks5://{proxy_host}:{proxy_port}'
            }
            add_log("PROXY", f"Подключение через прокси без авторизации")
        
        with sync_playwright() as p:
            add_log("BROWSER", "Запуск браузера Chrome")
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled'
                ]
            )
            
            add_log("CONTEXT", "Создание контекста браузера")
            context = browser.new_context(
                proxy=proxy_config,
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = context.new_page()
            page.set_default_timeout(60000)
            
            add_log("GOOGLE", "Переход на страницу входа Google")
            page.goto('https://accounts.google.com/signin', wait_until='domcontentloaded')
            time.sleep(random.uniform(2, 4))
            
            add_log("GOOGLE", "Ввод email")
            email_input = page.wait_for_selector('#identifierId', timeout=15000)
            email_input.fill(google_email)
            time.sleep(random.uniform(1, 2))
            
            add_log("GOOGLE", "Клик на кнопку 'Далее'")
            page.click('#identifierNext')
            time.sleep(random.uniform(3, 5))
            
            try:
                add_log("GOOGLE", "Ожидание поля пароля")
                password_input = page.wait_for_selector('input[name="Passwd"]', timeout=15000)
                
                add_log("GOOGLE", "Ввод пароля")
                password_input.fill(google_password)
                time.sleep(random.uniform(1, 2))
                
                add_log("GOOGLE", "Клик на кнопку входа")
                page.click('#passwordNext')
                time.sleep(random.uniform(4, 6))
                add_log("GOOGLE", "Успешный вход в Google")
            except PlaywrightTimeout:
                add_log("ERROR", "Google требует 2FA или капчу")
                return {
                    'success': False,
                    'error': 'Google требует дополнительную проверку (2FA или капча)',
                    'logs': logs
                }
            
            add_log("MARKTPLAATS", "Переход на Marktplaats.nl")
            page.goto('https://www.marktplaats.nl', wait_until='domcontentloaded')
            time.sleep(random.uniform(3, 5))
            
            try:
                add_log("MARKTPLAATS", "Поиск кнопки входа")
                login_btn = page.wait_for_selector('button:has-text("Inloggen"), a:has-text("Inloggen")', timeout=10000)
                add_log("MARKTPLAATS", "Клик на кнопку входа")
                login_btn.click()
                time.sleep(random.uniform(2, 3))
            except:
                add_log("MARKTPLAATS", "Кнопка входа не найдена, возможно уже авторизован")
                pass
            
            try:
                add_log("MARKTPLAATS", "Поиск кнопки 'Войти через Google'")
                google_btn = page.wait_for_selector('button:has-text("Google"), [aria-label*="Google"]', timeout=15000)
                add_log("MARKTPLAATS", "Клик на кнопку Google")
                google_btn.click()
                time.sleep(random.uniform(5, 7))
                add_log("MARKTPLAATS", "Авторизация через Google завершена")
            except PlaywrightTimeout:
                add_log("ERROR", "Кнопка Google не найдена на Marktplaats")
                return {
                    'success': False,
                    'error': 'Не найдена кнопка входа через Google на Marktplaats',
                    'logs': logs
                }
            
            add_log("SUCCESS", "Получение cookies")
            cookies = context.cookies()
            cookies_json = json.dumps(cookies)
            
            current_url = page.url
            page_title = page.title()
            
            add_log("SUCCESS", f"Регистрация завершена. URL: {current_url}")
            
            return {
                'success': True,
                'cookies': cookies_json,
                'url': current_url,
                'title': page_title,
                'message': f'Регистрация завершена успешно через прокси {proxy_host}:{proxy_port}',
                'logs': logs
            }
            
    except PlaywrightTimeout:
        add_log("ERROR", "Timeout при ожидании элемента")
        return {
            'success': False,
            'error': 'Timeout: элемент не найден или страница не загрузилась',
            'logs': logs
        }
    except Exception as e:
        add_log("ERROR", f"Исключение: {str(e)[:200]}")
        
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