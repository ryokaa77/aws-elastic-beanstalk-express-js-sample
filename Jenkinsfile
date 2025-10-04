pipeline {
    agent any

    environment {
        DOCKER_IMAGE_NAME = 'ryokaa77/express-js-sample'
        DOCKER_REGISTRY = 'docker.io'
        SNYK_ORG = 'ryokaa77'
        SNYK_PROJECT_NAME = 'express-js-sample'
        LOG_DIR = 'logs'
        REPORT_DIR = 'reports'
        DOCKER_TAG_LATEST = "${DOCKER_IMAGE_NAME}:latest"
        DOCKER_TAG_BUILD = "${DOCKER_IMAGE_NAME}:${BUILD_NUMBER}" // Jenkins 构建号
    }

    stages {
        stage('Prepare Workspace') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR} ${REPORT_DIR}
                    echo '=== Workspace Prepared ===' | tee -a ${LOG_DIR}/pipeline.log
                """
            }
        }

        stage('Checkout') {
            steps {
                sh """
                    echo '=== Checkout ===' | tee -a ${LOG_DIR}/checkout.log
                    git checkout ${GIT_BRANCH} 2>&1 | tee -a ${LOG_DIR}/checkout.log
                    git log -1 --pretty=oneline | tee -a ${LOG_DIR}/checkout.log
                """
            }
        }

        stage('Install & Test') {
            agent {
                docker { image 'node:16-bullseye' } 
            }
            steps {
                sh """
                    set -e
                    echo '=== Install Dependencies ===' | tee -a ${LOG_DIR}/install.log
                    npm install --save 2>&1 | tee -a ${LOG_DIR}/install.log

                    echo '=== Run Tests ===' | tee -a ${LOG_DIR}/test.log
                    if npm run test -- --help > /dev/null 2>&1; then
                        npm test 2>&1 | tee -a ${LOG_DIR}/test.log
                    else
                        echo "No tests defined, skipping" | tee -a ${LOG_DIR}/test.log
                    fi
                """
            }
        }

        stage('Snyk Scan') {
            agent {
                docker { image 'node:16-bullseye' }
            }
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh """
                        set -e
                        echo '=== Snyk Setup ===' | tee -a ${LOG_DIR}/snyk.log
                        apt-get update && apt-get install -y curl 2>&1 | tee -a ${LOG_DIR}/snyk.log
                        ARCH=\$(uname -m)
                        [ "\$ARCH" = "x86_64" ] && SNYK_URL=https://static.snyk.io/cli/latest/snyk-linux || SNYK_URL=https://static.snyk.io/cli/latest/snyk-linux-arm64
                        curl -Lo ~/snyk \$SNYK_URL
                        chmod +x ~/snyk
                        ~/snyk --version | tee -a ${LOG_DIR}/snyk.log
                        ~/snyk auth \$SNYK_TOKEN | tee -a ${LOG_DIR}/snyk.log

                        echo '=== Snyk Code Test ===' | tee -a ${LOG_DIR}/snyk.log
                        ~/snyk code test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-code-results.json 2>&1 | tee -a ${LOG_DIR}/snyk.log || true

                        echo '=== Snyk Dependency Test ===' | tee -a ${LOG_DIR}/snyk.log
                        npm install --save 2>&1 | tee -a ${LOG_DIR}/snyk.log
                        ~/snyk test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-report.json 2>&1 | tee -a ${LOG_DIR}/snyk.log || true
                    """
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    set -e
                    echo '=== Docker Build ===' | tee -a ${LOG_DIR}/docker.log
                    docker build -t ${DOCKER_TAG_LATEST} -t ${DOCKER_TAG_BUILD} . 2>&1 | tee -a ${LOG_DIR}/docker.log
                    echo 'Docker image built: ${DOCKER_TAG_LATEST}, ${DOCKER_TAG_BUILD}' | tee -a ${LOG_DIR}/docker.log
                """
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'DOCKER_CREDENTIALS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            set -e
                            echo '=== Docker Push ===' | tee -a ${LOG_DIR}/docker.log
                            docker login ${DOCKER_REGISTRY} -u ${DOCKER_USER} -p ${DOCKER_PASS} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            docker push ${DOCKER_TAG_LATEST} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            docker push ${DOCKER_TAG_BUILD} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            docker logout ${DOCKER_REGISTRY} 2>&1 | tee -a ${LOG_DIR}/docker.log
                            echo 'Docker push success' | tee -a ${LOG_DIR}/docker.log
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed'
            archiveArtifacts artifacts: "${LOG_DIR}/**/*, ${REPORT_DIR}/**/*", allowEmptyArchive: true
            cleanWs()
        }
        success { echo 'Pipeline success!' }
        failure { echo 'Pipeline failed!' }
    }
}
