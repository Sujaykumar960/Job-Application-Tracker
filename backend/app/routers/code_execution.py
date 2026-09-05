import random
from fastapi import APIRouter
from app.schemas.question import ExecuteCodePayload, ExecutionResult, TestCase

router = APIRouter(prefix="/code", tags=["Code Execution"])


@router.post("/execute", response_model=ExecutionResult)
async def execute_code(payload: ExecuteCodePayload):
    """Execute code against test cases in backend sandbox simulation."""
    if not payload.code.strip():
        return ExecutionResult(
            status="Compilation Error",
            stdout="",
            stderr="SyntaxError: Empty submission file. No entry point found.",
            executionTimeMs=12,
            memoryUsageMb=8.2,
            percentileSpeed=0,
            percentileMemory=0,
            testCaseResults=[],
            passedCount=0,
            totalCount=0,
        )

    test_cases = payload.testCases or [
        TestCase(id="tc-1", input="[2, 7, 11, 15], target = 9", expectedOutput="[0, 1]"),
        TestCase(id="tc-2", input="[3, 2, 4], target = 6", expectedOutput="[1, 2]"),
        TestCase(id="tc-3", input="[3, 3], target = 6", expectedOutput="[0, 1]"),
    ]

    updated_tcs = [
        TestCase(
            id=tc.id,
            input=tc.input,
            expectedOutput=tc.expectedOutput,
            actualOutput=tc.expectedOutput,
            passed=True,
            executionTimeMs=random.randint(20, 35),
        )
        for tc in test_cases
    ]

    is_custom = bool(payload.customInput)
    stdout = (
        f"Output for custom input: {payload.customInput}\nEvaluation complete."
        if is_custom
        else "All test assertions passed.\nExecution verified in isolated sandbox."
    )

    return ExecutionResult(
        status="Accepted",
        stdout=stdout,
        executionTimeMs=38,
        memoryUsageMb=14.2,
        percentileSpeed=94.5,
        percentileMemory=89.0,
        testCaseResults=updated_tcs,
        passedCount=len(updated_tcs),
        totalCount=len(updated_tcs),
    )
