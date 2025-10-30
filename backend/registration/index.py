import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime
import random
import string

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
                WHERE ga.status = 'active' 
                AND p.status = 'active'
                AND NOT EXISTS (
                    SELECT 1 FROM t_p24911867_account_registration.registration_tasks rt 
                    WHERE rt.google_account_id = ga.id 
                    AND rt.status IN ('pending', 'processing', 'completed')
                )
                AND NOT EXISTS (
                    SELECT 1 FROM t_p24911867_account_registration.registration_tasks rt 
                    WHERE rt.proxy_id = p.id 
                    AND rt.status IN ('pending', 'processing', 'completed')
                )
                LIMIT 10
            ''')
            pairs = cur.fetchall()
            
            for google_id, proxy_id in pairs:
                marktplaats_login = generate_username()
                marktplaats_password = generate_password()
                cur.execute(
                    'INSERT INTO t_p24911867_account_registration.registration_tasks (google_account_id, proxy_id, marktplaats_login, marktplaats_password, status) VALUES (%s, %s, %s, %s, %s)',
                    (google_id, proxy_id, marktplaats_login, marktplaats_password, 'pending')
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
            task_id = body_data.get('taskId')
            if task_id:
                cur.execute('UPDATE t_p24911867_account_registration.registration_tasks SET status = %s WHERE id = %s', ('processing', task_id))
                conn.commit()
                
                success = simulate_registration()
                
                if success:
                    cur.execute(
                        'UPDATE t_p24911867_account_registration.registration_tasks SET status = %s, completed_at = %s WHERE id = %s',
                        ('completed', datetime.utcnow(), task_id)
                    )
                else:
                    cur.execute(
                        'UPDATE t_p24911867_account_registration.registration_tasks SET status = %s, error_message = %s, attempts = attempts + 1 WHERE id = %s',
                        ('failed', 'Registration failed', task_id)
                    )
                
                conn.commit()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'success': True})
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


def simulate_registration() -> bool:
    return random.random() > 0.2