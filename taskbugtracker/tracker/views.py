import json
from django.db.models import Count
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from .models import Ticket, User


def dashboard(request):
    return render(request, "tracker/dashboard.html")


def body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return {}


@csrf_exempt
def users(request):
    if request.method == "POST":
        name = body(request).get("name", "").strip()
        if not name:
            return JsonResponse({"error": "name is required"}, status=400)
        user = User.objects.create(name=name)
        return JsonResponse({"id": user.id, "name": user.name}, status=201)
    return JsonResponse([{"id": u.id, "name": u.name} for u in User.objects.all()], safe=False)


@csrf_exempt
def tickets(request):
    if request.method == "POST":
        data = body(request)
        title = data.get("title", "").strip()
        priority = data.get("priority", "medium")
        if not title:
            return JsonResponse({"error": "title is required"}, status=400)
        if priority not in Ticket.PRIORITIES:
            return JsonResponse({"error": "invalid priority"}, status=400)
        ticket = Ticket.objects.create(
            title=title,
            description=data.get("description", ""),
            priority=priority,
            assignee_id=data.get("assignee_id"),
        )
        return JsonResponse(ticket.to_dict(), status=201)

    queryset = Ticket.objects.select_related("assignee").order_by("-id")
    status = request.GET.get("status")
    if status:
        queryset = queryset.filter(status=status)
    return JsonResponse([t.to_dict() for t in queryset], safe=False)


@csrf_exempt
def ticket_detail(request, ticket_id):
    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)

    if request.method == "DELETE":
        ticket.delete()
        return HttpResponse(status=204)

    if request.method == "PUT":
        data = body(request)
        if "status" in data:
            if data["status"] not in Ticket.STATUSES:
                return JsonResponse({"error": "invalid status"}, status=400)
            ticket.status = data["status"]
        if "priority" in data:
            if data["priority"] not in Ticket.PRIORITIES:
                return JsonResponse({"error": "invalid priority"}, status=400)
            ticket.priority = data["priority"]
        if data.get("title", "").strip():
            ticket.title = data["title"].strip()
        if "assignee_id" in data:
            ticket.assignee_id = data["assignee_id"]
        ticket.save()

    return JsonResponse(ticket.to_dict())


def stats(request):
    # SQL equivalent: LEFT JOIN + GROUP BY, tickets per user
    rows = User.objects.annotate(tickets=Count("ticket")).values("name", "tickets")
    return JsonResponse(list(rows), safe=False)

# Create your views here.
