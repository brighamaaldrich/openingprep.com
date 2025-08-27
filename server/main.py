import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from redis import Redis
from rq import Queue
from fastapi import HTTPException

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

@app.post("/api/analyze")
async def start_analysis(request: AnalysisRequest):
    try:
        from build_tree import get_final_json_tree
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
        # This will print the exact error to your Render API logs
        print("!!!!!!!!!! FAILED TO ENQUEUE JOB !!!!!!!!!!!")
        print(f"An exception occurred: {e}")
        import traceback
        traceback.print_exc()
        # Return a proper error to the frontend
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