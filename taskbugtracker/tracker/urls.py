from django.urls import path
from tracker import views

urlpatterns = [
    path("users", views.users),
    path("tickets", views.tickets),
    path("tickets/<int:ticket_id>", views.ticket_detail),
    path("stats", views.stats),]