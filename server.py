from flask import Flask
from flask import render_template
import analyze

app = Flask(__name__)

@app.route("/")
def main_page():
    return render_template('main.html')

@app.route('/analyze/<number>')
def analyze_patient(number):
    result = analyze.get_prediction(number)
    return result

@app.route('/patient/<number>')
def get_patient_data(number):
    return str(number)

if __name__ == "__main__":
    app.run(debug=True)
