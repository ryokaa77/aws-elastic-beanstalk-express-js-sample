pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        DOCKER_HOST = 'tcp://docker:2376'
        DOCKER_CERT_PATH = '/certs/client'
        DOCKER_TLS_VERIFY = '1'
        
        DOCKER_IMAGE_NAME = 'ryokaa77/express-js-sample'
        DOCKER_REGISTRY = 'docker.io'
        LOG_DIR = 'logs'
        REPORT_DIR = 'reports'
        DOCKER_TAG_LATEST = "${DOCKER_IMAGE_NAME}:latest"
        DOCKER_TAG_BUILD = "${DOCKER_IMAGE_NAME}:${BUILD_NUMBER}" 
    }

    stages {
         stage('Prepare Workspace') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR} ${REPORT_DIR}/junit ${REPORT_DIR}/scan
                    echo '=== Workspace Prepared ===' | tee -a ${LOG_DIR}/pipeline.log
                """
            }
        }

        stage('Install Dependencies') {
            agent {
                docker { 
                    image 'node:16-bullseye' 
                    reuseNode true 
                    args "-e DOCKER_HOST=${DOCKER_HOST} -e DOCKER_CERT_PATH=${DOCKER_CERT_PATH} -e DOCKER_TLS_VERIFY=${DOCKER_TLS_VERIFY}"            
                }
            }
            steps {
                sh """
                    set -e
                    echo '=== Installing Dependencies ===' >> &{LOG_DIR}/install.log
                    npm install 2>&1 | tee -a ${LOG_DIR}/install.log
                """
            }
        }

        stage('Run Tests') {
            agent {
                docker { 
                    image 'node:16-bullseye' 
                    reuseNode true 
                    args "-e DOCKER_HOST=${DOCKER_HOST} -e DOCKER_CERT_PATH=${DOCKER_CERT_PATH} -e DOCKER_TLS_VERIFY=${DOCKER_TLS_VERIFY}"            
                }
            }
            steps {
                sh """
                    set -e
                    echo '=== Running Tests ==='
                    npx jest --ci --reporters=default --reporters=jest-junit 2>&1 >> ${LOG_DIR}/test.log
                    echo '=== JUnit XML Files ===' >> ${LOG_DIR}/test.log
                    ls -l reports/junit 
                """
                junit allowEmptyResults: true, testResults: 'reports/junit/junit.xml'
            }
        }

        stage('Snyk Scan') {
            agent {
                docker { 
                    image 'node:16-bullseye' 
                    reuseNode true 
                    args "-e DOCKER_HOST=${DOCKER_HOST} -e DOCKER_CERT_PATH=${DOCKER_CERT_PATH} -e DOCKER_TLS_VERIFY=${DOCKER_TLS_VERIFY}"            
                }
            }
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh '''
                        set -e
                        
                        echo '=== Snyk Scan Started ==='

                        # Install tools
                        apt-get update -qq && apt-get install -y -qq curl jq > /dev/null 2>&1

                        # Download Snyk CLI
                        ARCH=$(uname -m)
                        if [ "$ARCH" = "aarch64" ]; then
                            SNYK_URL="https://static.snyk.io/cli/latest/snyk-linux-arm64"
                        else
                            SNYK_URL="https://static.snyk.io/cli/latest/snyk-linux"
                        fi
                        curl -fsSL -o ~/snyk "$SNYK_URL" && chmod +x ~/snyk
                        ~/snyk auth "$SNYK_TOKEN" > /dev/null 2>&1

                        echo "=== Running Snyk Dependency Scan ==="
                        ~/snyk test --severity-threshold=medium --json > ${REPORT_DIR}/scan/dep-report.json 2>&1

                        HIGH_CRITICAL=$(jq -r '[.vulnerabilities[] | select(.severity=="high" or .severity=="critical")] | length' ${REPORT_DIR}/scan/dep-report.json)

                        echo "High/Critical vulnerabilities found: $HIGH_CRITICAL"

                        # fail pipeline if any High/Critical
                        if [ "$HIGH_CRITICAL" -gt 0 ]; then
                            echo "Pipeline failing due to High/Critical vulnerabilities."
                            exit 1
                        fi

                        echo '=== Snyk Scan Done ===' >> ${LOG_DIR}/snyk.log
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            agent {
                docker {
                    image 'node:16-bullseye'
                    reuseNode true
                    args "-e DOCKER_HOST=${DOCKER_HOST} -e DOCKER_CERT_PATH=${DOCKER_CERT_PATH} -e DOCKER_TLS_VERIFY=${DOCKER_TLS_VERIFY}"
                }
            }
            steps {
                sh """
                    set -e
                    echo '=== Install Docker CLI ==='
                    
                    apt-get update -qq && apt-get install -y -qq curl > /dev/null 2>&1
                    curl -fsSL https://get.docker.com | sh -s -- --client-only > /dev/null 2>&1
                    
                    docker --version
                    
                    echo '=== Docker Build ===' | tee -a ${LOG_DIR}/docker.log
                  
                    if [ ! -f "Dockerfile" ]; then
                        echo "Error: Dockerfile not found!" | tee -a ${LOG_DIR}/docker.log
                        exit 1
                    fi
                    docker build -t ${DOCKER_TAG_LATEST} -t ${DOCKER_TAG_BUILD} . 2>&1 | tee -a ${LOG_DIR}/docker.log
                    echo "Built images: ${DOCKER_TAG_LATEST}, ${DOCKER_TAG_BUILD}" >> ${LOG_DIR}/docker.log
                """
            }
        }

        stage('Push Docker Image') {
            agent {
                docker {
                    image 'node:16-bullseye'
                    reuseNode true
                    args "-e DOCKER_HOST=${DOCKER_HOST} -e DOCKER_CERT_PATH=${DOCKER_CERT_PATH} -e DOCKER_TLS_VERIFY=${DOCKER_TLS_VERIFY}"
                }
            }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'DOCKER_CREDENTIALS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            set -e

                            echo '=== Docker Push ==='
                            echo "\${DOCKER_PASS}" | docker login ${DOCKER_REGISTRY} -u "\${DOCKER_USER}" --password-stdin 
                            docker push ${DOCKER_TAG_LATEST} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            docker push ${DOCKER_TAG_BUILD} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            docker logout ${DOCKER_REGISTRY} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            echo 'Docker push success' >> ${LOG_DIR}/docker.log
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Build completed in ${currentBuild.durationString}"
            archiveArtifacts artifacts: "${LOG_DIR}/**/*, ${REPORT_DIR}/**/*", allowEmptyArchive: true
            cleanWs()
        }
        success { echo 'Pipeline success!' }
        failure { echo 'Pipeline failed!' }
    }
}
