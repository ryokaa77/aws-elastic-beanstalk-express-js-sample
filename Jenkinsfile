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
        DOCKER_TAG_BUILD = "${DOCKER_IMAGE_NAME}:${BUILD_NUMBER}" // 用 Jenkins 构建号打版本标签
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

        stage('Install Dependencies & Test (Node 16)') {
            agent {
                docker { image 'node:16-bullseye' } 
            }
            steps {
                echo '=== Install Dependencies & Test ==='
                sh """
                    mkdir -p ${LOG_DIR}
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

        stage('Snyk Code Scan') {
            agent {
                docker { image 'node:16-bullseye' }
            }
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh """
                        mkdir -p ${LOG_DIR} ${REPORT_DIR}
                        echo '=== Snyk Code Scan ===' | tee -a ${LOG_DIR}/snyk-code.log

                     
                        apt-get update && apt-get install -y curl 2>&1 | tee -a ${LOG_DIR}/snyk-code.log
                        ARCH=\$(uname -m)
                        if [ "\$ARCH" = "x86_64" ]; then
                            curl -Lo ~/snyk https://static.snyk.io/cli/latest/snyk-linux
                        else
                            curl -Lo ~/snyk https://static.snyk.io/cli/latest/snyk-linux-arm64
                        fi
                        chmod +x ~/snyk
                        ~/snyk --version | tee -a ${LOG_DIR}/snyk-code.log

                        ~/snyk auth \$SNYK_TOKEN | tee -a ${LOG_DIR}/snyk-code.log
                        ~/snyk code test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-code-results.json 2>&1 | tee -a ${LOG_DIR}/snyk-code.log || true
                    """
                }
            }
        }

        stage('Snyk Dependency Scan') {
            agent {
                docker { image 'node:16-bullseye' }
            }
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh """
                        mkdir -p ${LOG_DIR} ${REPORT_DIR}
                        echo '=== Snyk Dependency Scan ===' | tee -a ${LOG_DIR}/snyk-deps.log

                       
                        apt-get update && apt-get install -y curl 2>&1 | tee -a ${LOG_DIR}/snyk-deps.log
                        ARCH=\$(uname -m)
                        if [ "\$ARCH" = "x86_64" ]; then
                            curl -Lo ~/snyk https://static.snyk.io/cli/latest/snyk-linux
                        else
                            curl -Lo ~/snyk https://static.snyk.io/cli/latest/snyk-linux-arm64
                        fi
                        chmod +x ~/snyk
                        ~/snyk --version | tee -a ${LOG_DIR}/snyk-deps.log

                        
                        npm install --save 2>&1 | tee -a ${LOG_DIR}/snyk-deps.log
                        ~/snyk auth \$SNYK_TOKEN | tee -a ${LOG_DIR}/snyk-deps.log
                        ~/snyk test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-report.json 2>&1 | tee -a ${LOG_DIR}/snyk-deps.log || true
                    """
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR}
                    echo '=== Docker Build ===' | tee -a ${LOG_DIR}/docker-build.log
                  
                    docker build -t ${DOCKER_TAG_LATEST} -t ${DOCKER_TAG_BUILD} . 2>&1 | tee -a ${LOG_DIR}/docker-build.log
                    echo 'Docker image completed（Tag：${DOCKER_TAG_LATEST}, ${DOCKER_TAG_BUILD}）' | tee -a ${LOG_DIR}/docker-build.log
                """
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    withCredentials([usernamePassword(
                        credentialsId: 'DOCKER_CREDENTIALS',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh """
                            mkdir -p ${LOG_DIR}
                            echo '=== Docker Push ===' | tee -a ${LOG_DIR}/docker-push.log
                          
                            docker login ${DOCKER_REGISTRY} -u ${DOCKER_USER} -p ${DOCKER_PASS} 2>&1 | tee -a ${LOG_DIR}/docker-push.log
                            docker push ${DOCKER_TAG_LATEST} 2>&1 | tee -a ${LOG_DIR}/docker-push.log
                            docker push ${DOCKER_TAG_BUILD} 2>&1 | tee -a ${LOG_DIR}/docker-push.log
                            docker logout ${DOCKER_REGISTRY} 2>&1 | tee -a ${LOG_DIR}/docker-push.log
                            echo 'Docker push success' | tee -a ${LOG_DIR}/docker-push.log
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed'
            archiveArtifacts artifacts: "${env.LOG_DIR}/**/*, ${env.REPORT_DIR}/**/*", allowEmptyArchive: true
            cleanWs() // 清理工作空间
        }
        success {
            echo 'Pipeline success！'
        }
        failure {
            echo 'Pipeline fail！'
        }
    }
}
