from flask import Flask
from flask import render_template
import analyze

app = Flask(__name__)

@app.route("/")
def main_page():
    return render_template('main.html')

@app.route('/analyze')
def analyze_page():
    f = open('data/patient1.json','r')
    analyze.input_health(f.read())
    return "test"

@app.route('/patient/<number>')
def get_patient_data(number):
    return str(number)

if __name__ == "__main__":
    app.run(debug=True)
