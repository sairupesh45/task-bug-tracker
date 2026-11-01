import json
from django.test import SimpleTestCase, TestCase


class DashboardPageTests(SimpleTestCase):
    def test_homepage_renders_dashboard(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Issue overview")
        self.assertContains(response, "tracker/dashboard.css")


class TicketApiTests(TestCase):
    def post(self, url, data):
        return self.client.post(url, json.dumps(data), content_type="application/json")

    def put(self, url, data):
        return self.client.put(url, json.dumps(data), content_type="application/json")

    def test_create_ticket_defaults(self):
        r = self.post("/api/tickets", {"title": "Login bug", "priority": "high"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "open")
        self.assertEqual(r.json()["priority"], "high")

    def test_title_is_required(self):
        r = self.post("/api/tickets", {"title": "  "})
        self.assertEqual(r.status_code, 400)

    def test_invalid_priority_rejected(self):
        r = self.post("/api/tickets", {"title": "X", "priority": "urgent"})
        self.assertEqual(r.status_code, 400)

    def test_update_status(self):
        t = self.post("/api/tickets", {"title": "Crash on save"}).json()
        r = self.put(f"/api/tickets/{t['id']}", {"status": "done"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "done")

    def test_invalid_status_rejected(self):
        t = self.post("/api/tickets", {"title": "Bug"}).json()
        r = self.put(f"/api/tickets/{t['id']}", {"status": "finished"})
        self.assertEqual(r.status_code, 400)

    def test_filter_by_status(self):
        self.post("/api/tickets", {"title": "A"})
        t = self.post("/api/tickets", {"title": "B"}).json()
        self.put(f"/api/tickets/{t['id']}", {"status": "done"})
        r = self.client.get("/api/tickets?status=done")
        self.assertEqual([x["title"] for x in r.json()], ["B"])

    def test_delete_ticket(self):
        t = self.post("/api/tickets", {"title": "Temp"}).json()
        self.assertEqual(self.client.delete(f"/api/tickets/{t['id']}").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/tickets/{t['id']}").status_code, 404)

    def test_stats_counts_tickets_per_user(self):
        uid = self.post("/api/users", {"name": "Rupesh"}).json()["id"]
        self.post("/api/tickets", {"title": "A", "assignee_id": uid})
        self.post("/api/tickets", {"title": "B", "assignee_id": uid})
        self.assertEqual(self.client.get("/api/stats").json(), [{"name": "Rupesh", "tickets": 2}])
# Create your tests here.
