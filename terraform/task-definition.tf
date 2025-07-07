
resource "aws_ecs_task_definition" "backend" {
  family                   = "slay-drip-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "slay-drip-backend"
      image     = "your-account-id.dkr.ecr.us-east-1.amazonaws.com/slay-drip-backend:latest"
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
    }
  ])

  tags = {
    Name        = "Slay Drip Backend Task Definition"
    Environment = "Dev"
  }
}
