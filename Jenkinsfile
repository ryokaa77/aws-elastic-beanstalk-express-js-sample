pipeline {
    agent {
        docker {
            image 'node:16-bullseye'
        }
    }

    environment {
        DOCKER_IMAGE_NAME = 'ryokaa77/express-js-sample'
        DOCKER_REGISTRY = 'docker.io'
        SNYK_ORG = 'ryokaa77'
        SNYK_PROJECT_NAME = 'express-js-sample'
        LOG_DIR = 'logs'
        REPORT_DIR = 'reports'
    }

    stages {
        stage('Checkout') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR}
                    echo '=== Checkout ===' | tee -a ${LOG_DIR}/checkout.log
                    git checkout ${GIT_BRANCH} 2>&1 | tee -a ${LOG_DIR}/checkout.log
                    git log -1 --pretty=oneline | tee -a ${LOG_DIR}/checkout.log
                """
            }
        }

        stage('Install Dependencies') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR}
                    echo '=== Install Dependencies ===' | tee -a ${LOG_DIR}/install.log
                    npm install --save 2>&1 | tee -a ${LOG_DIR}/install.log
                """
            }
        }

        stage('Unit Tests') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR}
                    echo '=== Unit Tests ===' | tee -a ${LOG_DIR}/test.log
                    npm test 2>&1 | tee -a ${LOG_DIR}/test.log || true
                """
            }
        }

        stage('Snyk Code Scan') {
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh """
                        mkdir -p ${LOG_DIR} ${REPORT_DIR}
                        echo '=== Snyk Code Scan ===' | tee -a ${LOG_DIR}/snyk-code.log
                        curl -Lo /usr/local/bin/snyk https://static.snyk.io/cli/latest/snyk-linux-arm64
                        chmod +x /usr/local/bin/snyk
                        snyk --version | tee -a ${LOG_DIR}/snyk-code.log
                        snyk auth \$SNYK_TOKEN | tee -a ${LOG_DIR}/snyk-code.log
                        snyk code test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-code-results.json 2>&1 | tee -a ${LOG_DIR}/snyk-code.log || true
                    """
                }
            }
        }

        stage('Snyk Dependency Scan') {
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh """
                        mkdir -p ${LOG_DIR} ${REPORT_DIR}
                        echo '=== Snyk Dependency Scan ===' | tee -a ${LOG_DIR}/snyk-deps.log
                        apt-get update && apt-get install -y libc6 libstdc++6
                        snyk auth \$SNYK_TOKEN | tee -a ${LOG_DIR}/snyk-deps.log
                        snyk test --json-file-output=${REPORT_DIR}/snyk-report.json 2>&1 | tee -a ${LOG_DIR}/snyk-deps.log || true
                    """
                }
            }
        }

        stage('Build Docker Image') {
            agent { label 'master' } 
            steps {
                sh """
                    mkdir -p ${LOG_DIR}
                    echo '=== Docker Build ===' | tee -a ${LOG_DIR}/docker-build.log
                """
                script {
                    def appImage = docker.build("${DOCKER_IMAGE_NAME}:latest")
                }
            }
        }

        stage('Push to Registry') {
            agent { label 'master' }
            steps {
                sh """
                    mkdir -p ${LOG_DIR}
                    echo '=== Docker Push ===' | tee -a ${LOG_DIR}/docker-push.log
                """
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'dockerhub-credentials') {
                        docker.image("${DOCKER_IMAGE_NAME}:latest").push()
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution completed'
            archiveArtifacts artifacts: "${env.LOG_DIR}/**/*, ${env.REPORT_DIR}/**/*", allowEmptyArchive: true
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
