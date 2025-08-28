import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from redis import Redis
from rq import Queue
import traceback
from build_tree import get_final_json_tree

class LichessFilters(BaseModel):
    color: str
    rated: bool = True
    clocks: bool = True
    max: int = 20000
    perfType: str = 'bullet,blitz,rapid,classical'

class AnalysisRequest(BaseModel):
    player1: str
    player2: str
    p1_filters: LichessFilters
    p2_filters: LichessFilters
    threshold: float = 0.15
    depth: int = 20
    token: str | None = None

redis_url = os.getenv('REDIS_URL', 'redis://redis:6379')
redis_conn = Redis.from_url(redis_url)
q = Queue(connection=redis_conn)
job_results = {}
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.post("/api/analyze-raw")
async def start_analysis_raw(request: Request):
    print("--- RAW ENDPOINT: /api/analyze-raw called ---")
    try:
        # We will manually parse the JSON, bypassing Pydantic validation
        body = await request.json()
        print("RAW ENDPOINT: Successfully received and parsed request body.")
        print("Body Content:", body)
        
        # We won't enqueue a job yet, just prove this works
        return {"message": "Raw endpoint successful", "received_body": body}

    except Exception as e:
        print(f"RAW ENDPOINT: Exception caught: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))





@app.post("/api/analyze")
async def start_analysis(request: AnalysisRequest):
    try:
        job = q.enqueue(
            get_final_json_tree,
            request.player1,
            request.player2,
            request.p1_filters.model_dump(),
            request.p2_filters.model_dump(),
            request.threshold,
            request.depth,
            job_timeout='30m'
        )
        return {"message": "Analysis job started", "job_id": job.get_id()}
    except Exception as e:
        print("!!!!!!!!!! FAILED TO ENQUEUE JOB !!!!!!!!!!!")
        print(f"An exception occurred: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/results/{job_id}")
async def get_status(job_id: str):
    job = q.fetch_job(job_id)
    if job:
        if job.is_finished:
            job_results[job_id] = job.result
            return {"status": "finished", "result": job.result}
        elif job.is_failed:
            return {"status": "failed"}
        else:
            progress = job.meta.get('progress', 'Analysis in progress...')
            return {"status": "running", "progress": progress}
    return {"status": "not_found"}



# In main.py, add this at the end of the file

@app.get("/api/test-imports")
async def test_imports():
    try:
        print("--- STARTING IMPORT TEST ---")
        
        print("1. Importing os...")
        import os
        print("   os OK.")
        
        print("2. Importing onnxruntime...")
        import onnxruntime
        print("   onnxruntime OK.")

        print("3. Importing numpy...")
        import numpy
        print("   numpy OK.")

        print("4. Importing chess...")
        import chess
        print("   chess OK.")

        print("5. Importing chess.engine...")
        import chess.engine
        print("   chess.engine OK.")
        
        print("6. Initializing Stockfish...")
        engine = chess.engine.SimpleEngine.popen_uci("/usr/local/bin/stockfish")
        print("   Stockfish initialized OK.")

        print("--- IMPORT TEST SUCCEEDED ---")
        return {"message": "All imports are working correctly!"}
        
    except Exception as e:
        print(f"CRITICAL ERROR DURING IMPORT TEST: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed during import test: {str(e)}")