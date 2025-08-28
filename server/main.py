import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from redis import Redis
from rq import Queue
from build_tree import get_final_json_tree

# --- Pydantic Models (unchanged) ---
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

# --- Redis Connection (Corrected for Render and Local) ---
redis_url = os.getenv('REDIS_URL', 'redis://redis:6379')
redis_conn = Redis.from_url(redis_url)
q = Queue(connection=redis_conn)

app = FastAPI()

# --- Middleware (unchanged) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- THE FINAL, CORRECTED ENDPOINT ---
@app.post("/api/analyze")
async def start_analysis(request: Request):
    try:
        # Step 1: Manually parse the JSON body, bypassing automatic validation.
        body = await request.json()
        print("Successfully received raw request body.")

        # Step 2: Manually validate the body using your Pydantic model.
        # This is the step that was previously crashing the server.
        validated_request = AnalysisRequest(**body)
        print("Successfully validated request with Pydantic.")

        # Step 3: Enqueue the job using the validated data.
        job = q.enqueue(
            get_final_json_tree,
            validated_request.player1,
            validated_request.player2,
            validated_request.p1_filters.model_dump(),
            validated_request.p2_filters.model_dump(),
            validated_request.threshold,
            validated_request.depth,
            job_timeout='30m'
        )
        print(f"Job successfully enqueued with ID: {job.get_id()}")
        return {"message": "Analysis job started", "job_id": job.get_id()}

    except ValidationError as e:
        # If the data is invalid, Pydantic will raise this specific error.
        print(f"Pydantic Validation Error: {e}")
        raise HTTPException(status_code=422, detail=e.errors())
        
    except Exception as e:
        # Catch any other unexpected errors during the process.
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

# --- Results Endpoint (unchanged) ---
@app.get("/api/results/{job_id}")
async def get_status(job_id: str):
    job = q.fetch_job(job_id)
    if job:
        if job.is_finished:
            return {"status": "finished", "result": job.result}
        elif job.is_failed:
            return {"status": "failed"}
        else:
            progress = job.meta.get('progress', 'Analysis in progress...')
            return {"status": "running", "progress": progress}
    return {"status": "not_found"}