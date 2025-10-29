import json
import os
import psycopg2
import csv
from io import StringIO
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Экспорт готовых аккаунтов
    Args: event с httpMethod, queryStringParameters (format, includeGoogle, includeProxy)
    Returns: HTTP response с данными для экспорта
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        export_format = params.get('format', 'json')
        include_google = params.get('includeGoogle', 'true') == 'true'
        include_proxy = params.get('includeProxy', 'true') == 'true'
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute('''
            SELECT 
                rt.marktplaats_login, rt.marktplaats_password,
                ga.email, ga.password,
                p.host, p.port, p.username, p.password,
                rt.cookies_data
            FROM t_p24911867_account_registration.registration_tasks rt
            LEFT JOIN t_p24911867_account_registration.google_accounts ga ON rt.google_account_id = ga.id
            LEFT JOIN t_p24911867_account_registration.proxies p ON rt.proxy_id = p.id
            WHERE rt.status = 'completed'
        ''')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        accounts = []
        for row in rows:
            account = {
                'marktplaats_login': row[0],
                'marktplaats_password': row[1]
            }
            if include_google:
                account['google_email'] = row[2]
                account['google_password'] = row[3]
            if include_proxy:
                account['proxy'] = f'{row[4]}:{row[5]}' if row[4] else None
                if row[6]:
                    account['proxy_auth'] = f'{row[6]}:{row[7]}'
            if row[8]:
                account['cookies'] = row[8]
            accounts.append(account)
        
        if export_format == 'csv':
            output = StringIO()
            if accounts:
                writer = csv.DictWriter(output, fieldnames=accounts[0].keys())
                writer.writeheader()
                writer.writerows(accounts)
            content = output.getvalue()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'text/csv',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Disposition': 'attachment; filename="marktplaats_accounts.csv"'
                },
                'isBase64Encoded': False,
                'body': content
            }
        
        elif export_format == 'txt':
            lines = []
            for acc in accounts:
                line = f"{acc['marktplaats_login']}:{acc['marktplaats_password']}"
                if include_google:
                    line += f" | {acc.get('google_email')}:{acc.get('google_password')}"
                if include_proxy and acc.get('proxy'):
                    line += f" | {acc['proxy']}"
                lines.append(line)
            content = '\n'.join(lines)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Disposition': 'attachment; filename="marktplaats_accounts.txt"'
                },
                'isBase64Encoded': False,
                'body': content
            }
        
        elif export_format == 'cookies':
            cookies_list = []
            for acc in accounts:
                if acc.get('cookies'):
                    cookies_list.append({
                        'login': acc['marktplaats_login'],
                        'cookies': acc['cookies']
                    })
            content = json.dumps(cookies_list, indent=2)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Disposition': 'attachment; filename="marktplaats_cookies.json"'
                },
                'isBase64Encoded': False,
                'body': content
            }
        
        else:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'accounts': accounts})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }