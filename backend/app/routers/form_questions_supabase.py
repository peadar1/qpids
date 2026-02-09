"""Form Questions router using Supabase"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List, Dict
from .. import schemas
from .. import crud_supabase as crud
from ..supabase_client import get_supabase_admin
from ..dependencies_supabase import require_role

router = APIRouter(
    prefix="/api/events/{event_id}/form-questions",
    tags=["form-questions"]
)


@router.get("/public", response_model=List[schemas.FormQuestionResponse])
def get_public_form_questions(
    event_id: str,
    supabase: Client = Depends(get_supabase_admin)
):
    """Get active form questions for participant registration (no auth required)."""
    # Verify event exists
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    questions = crud.get_event_form_questions(supabase, event_id, active_only=True)
    return questions


@router.get("", response_model=List[schemas.FormQuestionResponse])
def get_form_questions(
    event_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get all form questions for an event (requires auth)."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    questions = crud.get_event_form_questions(supabase, event_id)
    return questions


@router.post("", response_model=schemas.FormQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_form_question(
    event_id: str,
    question: schemas.FormQuestionCreate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Create a new form question."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    question_data = question.model_dump()
    db_question = crud.create_form_question(supabase, event_id, question_data)
    return db_question


# IMPORTANT: /reorder must come BEFORE /{question_id} to avoid route conflicts
@router.put("/reorder", status_code=status.HTTP_200_OK)
def reorder_form_questions(
    event_id: str,
    reorder_data: schemas.FormQuestionReorder,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Reorder form questions."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    questions = [q.model_dump() for q in reorder_data.questions]
    crud.reorder_form_questions(supabase, questions)
    return {"message": "Questions reordered successfully"}


@router.get("/{question_id}", response_model=schemas.FormQuestionResponse)
def get_form_question(
    event_id: str,
    question_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get a specific form question by ID."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    question = crud.get_form_question_by_id(supabase, question_id)
    if not question or question['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form question not found"
        )

    return question


@router.put("/{question_id}", response_model=schemas.FormQuestionResponse)
def update_form_question(
    event_id: str,
    question_id: str,
    question_update: schemas.FormQuestionUpdate,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update a form question."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    question = crud.get_form_question_by_id(supabase, question_id)
    if not question or question['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form question not found"
        )

    question_data = question_update.model_dump(exclude_unset=True)
    updated_question = crud.update_form_question(supabase, question_id, question_data)
    return updated_question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_question(
    event_id: str,
    question_id: str,
    current_user: Dict = Depends(require_role('matcher')),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete a form question."""
    # Verify event access
    event = crud.get_event_by_id(supabase, event_id)
    if not event or event['creator_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )

    question = crud.get_form_question_by_id(supabase, question_id)
    if not question or question['event_id'] != event_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form question not found"
        )

    crud.delete_form_question(supabase, question_id)
    return None
