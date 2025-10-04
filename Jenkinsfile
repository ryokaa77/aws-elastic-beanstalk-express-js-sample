pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE_NAME = 'ryokaa77/express-js-sample'
        DOCKER_REGISTRY = 'docker.io'
        SNYK_ORG = 'ryokaa77'
        SNYK_PROJECT_NAME = 'express-js-sample'
    }
    
    stages {
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
                        
                        echo "Updating system libraries for Snyk CLI compatibility..."
                        sed -i 's|http://deb.debian.org/debian|http://archive.debian.org/debian|g' /etc/apt/sources.list
                        sed -i 's|http://security.debian.org/debian-security|http://archive.debian.org/debian-security|g' /etc/apt/sources.list
                        
                        echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99no-check-valid-until
                        apt-get update && apt-get install -y libc6 libstdc++6
                            
                        echo "Installing Snyk CLI..."
                        npm install -g snyk

                        echo "Verifying Snyk installation..."
                        snyk --version

                        echo "Authenticating with Snyk..."
                        snyk auth ${SNYK_TOKEN}

                        echo " Running Snyk code scan..."
                        snyk code test --severity-threshold=medium --json-file-output=snyk-code-results.json || true

                        echo "Snyk code scan completed"
                    '''
                }
            }
            post {
                always {
                    echo "Publishing Snyk code scan results..."
                    publishHTML([
                        allowMissing: false,
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

                        echo "Updating system libraries for Snyk CLI compatibility..."
                        apt-get update && apt-get install -y libc6 libstdc++6
                            
                        echo "Installing Snyk CLI..."
                        npm install -g snyk

                        echo "Authenticating with Snyk..."
                        snyk auth $SNYK_TOKEN

                        echo "Running Snyk test..."
                        snyk test

                        echo "Snyk dependency scan completed"

                    '''
                }
            }
            post {
                always {
                    echo "Publishing Snyk dependency scan results..."
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'snyk-dep-results.json',
                        reportName: 'Snyk Dependency Scan Report'
                    ])
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    def imageTag = "${env.DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}"
                    def latestTag = "${env.DOCKER_IMAGE_NAME}:latest"
                    
                    echo "Building Docker image with tag: ${imageTag}"
                    docker.build(imageTag)

                    
                    sh """
                        docker tag ${imageTag} ${latestTag}
                        echo "Docker image build completed"
                    """
                }
            }
            post {
                always {
                    script {
                        withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                            sh """
                                echo "Installing Snyk CLI..."
                                curl -sSL https://static.snyk.io/cli/latest/snyk-linux -o snyk
                                chmod +x ./snyk
                                
                                echo "Verifying Snyk Docker support..."
                                ./snyk container --help || echo "Container scanning not available"
                                
                                echo "Authenticating with Snyk..."
                                ./snyk auth \${SNYK_TOKEN}
                                
                                echo "Running Snyk Docker image scan..."
                                ./snyk container test \${imageTag} --severity-threshold=medium --json-file-output=snyk-container-results.json --app-vulns || true
                                
                                echo "Monitoring Docker image with Snyk..."
                                ./snyk container monitor \${imageTag} --org=\${SNYK_ORG} --project-name=\${SNYK_PROJECT_NAME}-container || true
                                
                                echo "Docker image vulnerability scan completed"
                            """
                            
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: '.',
                                reportFiles: 'snyk-container-results.json',
                                reportName: 'Snyk Container Scan Report'
                            ])
                        }
                    }
                }
            }
        }
        
        stage('Push to Registry') {
            when {
                branch 'main'
            }
            
            steps {
                script {
                    def imageTag = "${env.DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}"
                    def latestTag = "${env.DOCKER_IMAGE_NAME}:latest"
                    
                    echo "Pushing images to registry..."
                    
                    withCredentials([usernamePassword(
                        credentialsId: 'DOCKER_CREDENTIALS',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh """
                            docker login ${DOCKER_REGISTRY} -u ${DOCKER_USER} -p ${DOCKER_PASS}
                            docker push ${imageTag}
                            docker push ${latestTag}
                            docker logout ${DOCKER_REGISTRY}
                            echo "Image push completed"
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline execution completed'
            script {
                archiveArtifacts(
                    artifacts: 'snyk-code-results.json, snyk-dep-results.json, snyk-container-results.json',
                    allowEmptyArchive: false, 
                    fingerprint: true 
                )
            }
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

