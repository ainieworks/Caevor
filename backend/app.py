from flask import Flask, jsonify, request

app = Flask(__name__)

@app.get("/health")
def health():
    return jsonify(status="ok", service="DeepFocusPlus-backend")

@app.post("/api/priority")
def priority():
    payload = request.get_json(force=True)
    # TODO: implement adaptive weighting logic later
    return jsonify(result="stub", tasks=len(payload.get("tasks", [])))

if __name__ == "__main__":
    app.run(debug=True)
