import json
import dateutil.parser

def input_health(health_json):
    health_dict = json.loads(health_json)
    for entry in health_dict.get('bloodGlucose'):
        date = entry.get('readingDate')
        fix_date(date)

def fix_date(date):
    parsed = dateutil.parser.parse(date)
    print parsed.hour + parsed.minute/60.0 + parsed.second/3600.0
