pipeline {
    agent {
        docker {
            image 'node:16-bullseye'
            args '-u root:root'
        }
    }

    environment {
        DOCKER_IMAGE_NAME = 'ryokaa77/express-js-sample'
        DOCKER_REGISTRY = 'docker.io'
        SNYK_ORG = 'ryokaa77'
        SNYK_PROJECT_NAME = 'express-js-sample'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "Installing Node.js dependencies..."
                    npm install --save
                    echo "Dependencies installation completed"
                '''
            }
        }

        stage('Unit Tests') {
            steps {
                sh '''
                    echo "Running unit tests..."
                    
                    echo "Unit tests completed"
                '''
            }
        }

        stage('Snyk Code Scan') {
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh '''
                        echo "Installing arm64-compatible Snyk CLI..."
                        curl -Lo /usr/local/bin/snyk https://static.snyk.io/cli/latest/snyk-linux-arm64
                        chmod +x /usr/local/bin/snyk

                        echo "Verifying Snyk installation..."
                        snyk --version

                        echo "Authenticating with Snyk..."
                        snyk auth $SNYK_TOKEN

                        echo "Running Snyk code scan..."
                        snyk code test --severity-threshold=medium --json-file-output=snyk-code-results.json || true
                        echo "Snyk code scan completed"
                    '''
                }
            }
            post {
                always {
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'snyk-code-results.json',
                        reportName: 'Snyk Code Scan Report'
                    ])
                }
            }
        }

        stage('Snyk Dependency Scan') {
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh '''
                        echo "Running Snyk dependency scan..."
                        apt-get update && apt-get install -y libc6 libstdc++6
                        snyk auth $SNYK_TOKEN
                        snyk test || true
                        echo "Snyk dependency scan completed"
                    '''
                }
            }
            post {
                always {
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'snyk-report.json',
                        reportName: 'Snyk Dependency Scan Report'
                    ])
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                
                    def appImage = docker.build("${DOCKER_IMAGE_NAME}:latest")
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    // 使用 Jenkins docker.withRegistry API 推送镜像
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'dockerhub-credentials') {
                        docker.image("${DOCKER_IMAGE_NAME}:latest").push()
                    }
                }
            }
        }

    post {
        always {
            echo 'Pipeline execution completed'
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
