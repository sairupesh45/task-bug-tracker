from django.db import models


class User(models.Model):
    name = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.name


class Ticket(models.Model):
    STATUSES = ["open", "in_progress", "done"]
    PRIORITIES = ["low", "medium", "high"]

    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, default="open")
    priority = models.CharField(max_length=10, default="medium")
    assignee = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "assignee": self.assignee.name if self.assignee else None,
        }

# Create your models here.
