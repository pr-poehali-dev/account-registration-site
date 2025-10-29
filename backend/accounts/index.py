import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление Google аккаунтами
    Args: event с httpMethod, body, queryStringParameters
    Returns: HTTP response с данными аккаунтов
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if method == 'GET':
        cur.execute('SELECT id, email, status, created_at FROM t_p24911867_account_registration.google_accounts ORDER BY created_at DESC')
        rows = cur.fetchall()
        accounts = [
            {'id': row[0], 'email': row[1], 'status': row[2], 'createdAt': row[3].isoformat()}
            for row in rows
        ]
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'accounts': accounts})
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        accounts_data = body_data.get('accounts', [])
        
        for acc in accounts_data:
            cur.execute(
                'INSERT INTO t_p24911867_account_registration.google_accounts (email, password) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING',
                (acc['email'], acc['password'])
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'success': True, 'count': len(accounts_data)})
        }
    
    if method == 'DELETE':
        account_id = event.get('queryStringParameters', {}).get('id')
        if account_id:
            cur.execute('DELETE FROM t_p24911867_account_registration.google_accounts WHERE id = %s', (account_id,))
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