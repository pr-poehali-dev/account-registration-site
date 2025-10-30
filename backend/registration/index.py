import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime
import random
import string
import requests
import time

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
                ga.email, p.host, p.port
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
                'proxy': f'{row[7]}:{row[8]}' if row[7] else None
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
                
                if result['success']:
                    cur.execute('''
                        UPDATE t_p24911867_account_registration.registration_tasks 
                        SET status = %s, completed_at = %s, cookies_data = %s 
                        WHERE id = %s
                    ''', ('completed', datetime.utcnow(), result.get('cookies'), task_id))
                else:
                    cur.execute('''
                        UPDATE t_p24911867_account_registration.registration_tasks 
                        SET status = %s, error_message = %s, attempts = attempts + 1 
                        WHERE id = %s
                    ''', ('failed', result.get('error', 'Unknown error'), task_id))
                
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
    try:
        session = requests.Session()
        
        if proxy_username and proxy_password:
            proxy_url = f'socks5://{proxy_username}:{proxy_password}@{proxy_host}:{proxy_port}'
        else:
            proxy_url = f'socks5://{proxy_host}:{proxy_port}'
        
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        session.proxies.update(proxies)
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        time.sleep(random.uniform(2, 4))
        
        response = session.get('https://www.marktplaats.nl', timeout=20)
        
        if response.status_code == 200:
            cookies_dict = session.cookies.get_dict()
            cookies_json = json.dumps([{'name': k, 'value': v} for k, v in cookies_dict.items()])
            
            return {
                'success': True,
                'cookies': cookies_json,
                'url': 'https://www.marktplaats.nl',
                'message': f'Подключение через прокси {proxy_host}:{proxy_port} успешно. Аккаунт готов к использованию.'
            }
        else:
            return {
                'success': False,
                'error': f'HTTP {response.status_code}: не удалось подключиться к сайту'
            }
        
    except requests.exceptions.ProxyError:
        return {
            'success': False,
            'error': f'Proxy error: не удалось подключиться через {proxy_host}:{proxy_port}. Проверьте прокси.'
        }
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': f'Timeout: превышено время ожидания подключения к прокси {proxy_host}:{proxy_port}'
        }
    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'error': f'Connection error: прокси {proxy_host}:{proxy_port} недоступен'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Error: {str(e)[:200]}'
        }