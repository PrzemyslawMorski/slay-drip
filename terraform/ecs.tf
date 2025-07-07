
resource "aws_ecs_cluster" "main" {
  name = "slay-drip-cluster"

  tags = {
    Name        = "Slay Drip Cluster"
    Environment = "Dev"
  }
}
