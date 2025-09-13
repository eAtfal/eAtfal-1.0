from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 2)  # wait 1-2 sec between requests

    @task
    def load_courses(self):
        # Replace with one of your FastAPI endpoints
        self.client.get("/api/v1/courses")
