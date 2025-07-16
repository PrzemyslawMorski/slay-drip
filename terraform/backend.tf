terraform {
  backend "s3" {
    bucket         = "slay-drip-tfstate"
    key            = "terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "slay-drip-tfstate-lock"
    encrypt        = true
  }
}

# Backend Deployment Resources

# ECR Repository for backend container images
resource "aws_ecr_repository" "backend_repository" {
  name                 = "${var.app_name}-backend-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.app_name} Backend Repository"
    Environment = var.environment
    Project     = var.app_name
  }
}

# ECR Lifecycle Policy to clean up old images
resource "aws_ecr_lifecycle_policy" "backend_lifecycle_policy" {
  repository = aws_ecr_repository.backend_repository.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# VPC for backend deployment
resource "aws_vpc" "backend_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.app_name}-backend-vpc-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Internet Gateway
resource "aws_internet_gateway" "backend_igw" {
  vpc_id = aws_vpc.backend_vpc.id

  tags = {
    Name        = "${var.app_name}-backend-igw-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Public Subnet
resource "aws_subnet" "backend_public_subnet" {
  vpc_id                  = aws_vpc.backend_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.app_name}-backend-public-subnet-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Route Table for public subnet
resource "aws_route_table" "backend_public_rt" {
  vpc_id = aws_vpc.backend_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.backend_igw.id
  }

  tags = {
    Name        = "${var.app_name}-backend-public-rt-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Route Table Association
resource "aws_route_table_association" "backend_public_rta" {
  subnet_id      = aws_subnet.backend_public_subnet.id
  route_table_id = aws_route_table.backend_public_rt.id
}

# Security Group for ALB
resource "aws_security_group" "backend_alb_sg" {
  name        = "${var.app_name}-backend-alb-sg-${var.environment}"
  description = "Security group for backend ALB"
  vpc_id      = aws_vpc.backend_vpc.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-backend-alb-sg-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Security Group for Fargate tasks
resource "aws_security_group" "backend_fargate_sg" {
  name        = "${var.app_name}-backend-fargate-sg-${var.environment}"
  description = "Security group for backend Fargate tasks"
  vpc_id      = aws_vpc.backend_vpc.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.backend_alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-backend-fargate-sg-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Application Load Balancer
resource "aws_lb" "backend_alb" {
  name               = "${var.app_name}-backend-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.backend_alb_sg.id]
  subnets            = [aws_subnet.backend_public_subnet.id]

  enable_deletion_protection = false

  tags = {
    Name        = "${var.app_name}-backend-alb-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# ALB Target Group
resource "aws_lb_target_group" "backend_tg" {
  name        = "${var.app_name}-backend-tg-${var.environment}"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.backend_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "${var.app_name}-backend-tg-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# ALB Listener
resource "aws_lb_listener" "backend_listener" {
  load_balancer_arn = aws_lb.backend_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "backend_cluster" {
  name = "${var.app_name}-backend-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.app_name}-backend-cluster-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "backend_task" {
  family                   = "${var.app_name}-backend-task-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256  # Smallest CPU unit (0.25 vCPU)
  memory                   = 512  # Smallest memory unit (0.5 GB)
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "${var.app_name}-backend-container-${var.environment}"
      image = "${aws_ecr_repository.backend_repository.repository_url}:latest"

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "8080"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.app_name}-backend-task-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# ECS Service
resource "aws_ecs_service" "backend_service" {
  name            = "${var.app_name}-backend-service-${var.environment}"
  cluster         = aws_ecs_cluster.backend_cluster.id
  task_definition = aws_ecs_task_definition.backend_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.backend_public_subnet.id]
    security_groups  = [aws_security_group.backend_fargate_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend_tg.arn
    container_name   = "${var.app_name}-backend-container-${var.environment}"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.backend_listener]

  tags = {
    Name        = "${var.app_name}-backend-service-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "backend_logs" {
  name              = "/ecs/${var.app_name}-backend-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.app_name}-backend-logs-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# IAM Role for ECS Execution
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.app_name}-backend-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-backend-ecs-execution-role-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# IAM Policy for ECS Execution
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.app_name}-backend-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-backend-ecs-task-role-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
  }
}

# Auto Scaling Group for ECS Service
resource "aws_appautoscaling_target" "backend_target" {
  max_capacity       = 2
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.backend_cluster.name}/${aws_ecs_service.backend_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy for CPU
resource "aws_appautoscaling_policy" "backend_cpu_policy" {
  name               = "${var.app_name}-backend-cpu-policy-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_target.resource_id
  scalable_dimension = aws_appautoscaling_target.backend_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Policy for Memory
resource "aws_appautoscaling_policy" "backend_memory_policy" {
  name               = "${var.app_name}-backend-memory-policy-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_target.resource_id
  scalable_dimension = aws_appautoscaling_target.backend_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 70.0
  }
}

# Outputs for Backend Deployment
output "backend_ecr_repository_url" {
  description = "The URL of the ECR repository for backend images"
  value       = aws_ecr_repository.backend_repository.repository_url
}

output "backend_ecr_repository_name" {
  description = "The name of the ECR repository for backend images"
  value       = aws_ecr_repository.backend_repository.name
}

output "backend_alb_dns_name" {
  description = "The DNS name of the backend Application Load Balancer"
  value       = aws_lb.backend_alb.dns_name
}

output "backend_alb_zone_id" {
  description = "The canonical hosted zone ID of the backend ALB"
  value       = aws_lb.backend_alb.zone_id
}

output "backend_ecs_cluster_name" {
  description = "The name of the ECS cluster for backend services"
  value       = aws_ecs_cluster.backend_cluster.name
}

output "backend_ecs_service_name" {
  description = "The name of the ECS service for backend"
  value       = aws_ecs_service.backend_service.name
}

output "backend_cloudwatch_log_group" {
  description = "The CloudWatch log group for backend logs"
  value       = aws_cloudwatch_log_group.backend_logs.name
}

output "backend_api_url" {
  description = "The URL for the backend API"
  value       = "http://${aws_lb.backend_alb.dns_name}"
}

output "backend_swagger_url" {
  description = "The URL for the backend Swagger documentation"
  value       = "http://${aws_lb.backend_alb.dns_name}/swagger/index.html"
} 