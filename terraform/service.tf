
resource "aws_ecs_service" "backend" {
  name            = "slay-drip-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = ["your-subnet-id"]
    security_groups = ["your-security-group-id"]
  }

  tags = {
    Name        = "Slay Drip Backend Service"
    Environment = "Dev"
  }
}
