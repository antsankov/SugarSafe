import json
from dateutil import *

def input_health(health_json):
    health_dict = json.loads(health_json)
    for entry in health_dict.get('bloodGlucose'):
        date = entry.get('readingDate')
        fix_date(date)

def fix_date(date):
    print(dateutil.parser.parse(date))
