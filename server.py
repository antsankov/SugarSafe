from flask import Flask
from flask import render_template

app = Flask(__name__)

@app.route('/hello/')
def hello(name=None):
    return render_template('weird.html', name=name)

if __name__ == "__main__":
    app.run()
