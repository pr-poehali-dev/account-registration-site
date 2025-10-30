import json
import os
import psycopg2
import requests
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление прокси-серверами
    Args: event с httpMethod, body, queryStringParameters
    Returns: HTTP response с данными прокси
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'isBase64Encoded': False,
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute('SELECT id, host, port, username, status, last_checked, created_at FROM t_p24911867_account_registration.proxies ORDER BY created_at DESC')
        rows = cur.fetchall()
        proxies = [
            {
                'id': row[0],
                'host': row[1],
                'port': row[2],
                'username': row[3],
                'status': row[4],
                'lastChecked': row[5].isoformat() if row[5] else None,
                'createdAt': row[6].isoformat()
            }
            for row in rows
        ]
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'proxies': proxies})
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        proxies_data = body_data.get('proxies', [])
        
        for proxy in proxies_data:
            cur.execute(
                'INSERT INTO t_p24911867_account_registration.proxies (host, port, username, password) VALUES (%s, %s, %s, %s) ON CONFLICT (host, port) DO NOTHING',
                (proxy['host'], proxy['port'], proxy.get('username'), proxy.get('password'))
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'success': True, 'count': len(proxies_data)})
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        proxy_id = body_data.get('id')
        
        if proxy_id:
            cur.execute('UPDATE t_p24911867_account_registration.proxies SET status = %s, last_checked = %s WHERE id = %s',
                       ('checking', datetime.utcnow(), proxy_id))
            conn.commit()
            
            cur.execute('SELECT host, port, username, password FROM t_p24911867_account_registration.proxies WHERE id = %s', (proxy_id,))
            proxy_data = cur.fetchone()
            
            if proxy_data:
                is_working = test_proxy(proxy_data[0], proxy_data[1], proxy_data[2], proxy_data[3])
                status = 'active' if is_working else 'failed'
                cur.execute('UPDATE t_p24911867_account_registration.proxies SET status = %s WHERE id = %s', (status, proxy_id))
                conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    if method == 'DELETE':
        proxy_id = event.get('queryStringParameters', {}).get('id')
        if proxy_id:
            cur.execute('DELETE FROM t_p24911867_account_registration.proxies WHERE id = %s', (proxy_id,))
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


def test_proxy(host: str, port: str, username: str = None, password: str = None) -> bool:
    try:
        proxy_url = f'http://{username}:{password}@{host}:{port}' if username else f'http://{host}:{port}'
        proxies = {'http': proxy_url, 'https': proxy_url}
        response = requests.get('https://httpbin.org/ip', proxies=proxies, timeout=10)
        return response.status_code == 200
    except:
        return False