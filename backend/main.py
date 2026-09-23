from fastapi import FastAPI

app = FastAPI(title="SeMS API")

@app.get("/")
def read_root():
    return {"status": "SeMS API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}