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
        SNYK_ORG = 'ryokaa77'
        SNYK_PROJECT_NAME = 'express-js-sample'
        LOG_DIR = 'logs'
        REPORT_DIR = 'reports'
        DOCKER_TAG_LATEST = "${DOCKER_IMAGE_NAME}:latest"
        DOCKER_TAG_BUILD = "${DOCKER_IMAGE_NAME}:${BUILD_NUMBER}" 
    }

    stages {
        stage('Prepare Workspace') {
            steps {
                sh """
                    mkdir -p ${LOG_DIR} ${REPORT_DIR}
                    echo '=== Workspace Prepared ===' | tee -a ${LOG_DIR}/pipeline.log

                    echo '=== Git Information ===' | tee -a ${LOG_DIR}/checkout.log
                    echo "Branch: ${GIT_BRANCH}" | tee -a ${LOG_DIR}/checkout.log
                    echo "Commit: ${GIT_COMMIT}" | tee -a ${LOG_DIR}/checkout.log
                    git log -1 --pretty=format:'%h - %an, %ar : %s' | tee -a ${LOG_DIR}/checkout.log
                """
            }
        }


        stage('Install & Test & Docker Build') {
            agent {
                docker { 
                    // image 'node:16-bullseye' 
                    // reuseNode true
                     image 'node:16-bullseye'
                     reuseNode true
                     args "-e DOCKER_HOST=${DOCKER_HOST} -e DOCKER_CERT_PATH=${DOCKER_CERT_PATH} -e DOCKER_TLS_VERIFY=${DOCKER_TLS_VERIFY}"
                       
                } 
            }
            steps {
                sh """
                    set -e

                    echo '=== Node Version ===' | tee -a ${LOG_DIR}/install.log
                    node -v
                    npm -v
                    
                    echo '=== Install Dependencies ===' | tee -a ${LOG_DIR}/install.log
                    npm install --save 2>&1 | tee -a ${LOG_DIR}/install.log

                    echo '=== Run Tests ===' | tee -a ${LOG_DIR}/test.log
                    if npm run test -- --help > /dev/null 2>&1; then
                        npm test 2>&1 | tee -a ${LOG_DIR}/test.log
                    else
                        echo "No tests defined, skipping" | tee -a ${LOG_DIR}/test.log
                    fi

                    echo '=== Install Docker CLI ===' | tee -a ${LOG_DIR}/docker.log
                    apt-get update -qq && apt-get install -y -qq docker.io
                    docker --version | tee -a ${LOG_DIR}/docker.log


                    echo '=== Docker Build ===' | tee -a ${LOG_DIR}/docker.log
                    docker build -t ${DOCKER_TAG_BUILD} -t ${DOCKER_TAG_LATEST} . 2>&1 | tee -a ${LOG_DIR}/docker.log
                """
            }
        }

        stage('Snyk Scan') {
            agent {
                docker { 
                    image 'node:16-bullseye'
                    reuseNode true
                }
            }
            steps {
                withCredentials([string(credentialsId: 'SNYK_CREDENTIALS', variable: 'SNYK_TOKEN')]) {
                    sh """
                        set -e
                        echo '=== Snyk Setup ==='
                        apt-get update -qq && apt-get install -y -qq curl > /dev/null 2>&1
                        
                        ARCH=\$(uname -m)
                        if [ "$ARCH" = "x86_64" ]; then
                            SNYK_URL=https://static.snyk.io/cli/latest/snyk-linux
                        else
                            SNYK_URL=https://static.snyk.io/cli/latest/snyk-linux-arm64
                        fi
                        
                        curl -Lo ~/snyk \$SNYK_URL
                        chmod +x ~/snyk
                        ~/snyk --version > /dev/null
                        
                        ~/snyk auth \$SNYK_TOKEN > /dev/null

                        # -------------------------
                        # Snyk Code Test
                        # -------------------------
                        ~/snyk code test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-code-results.json 2>&1 | tee ${LOG_DIR}/snyk-code.log || true
        
                        echo "=== Snyk Code Test Summary ==="
                        jq -r '[.vulnerabilities[].severity] | group_by(.) | map({(.[0]): length}) | add' ${REPORT_DIR}/snyk-code-results.json || echo "No vulnerabilities found"
        
                        # -------------------------
                        # Snyk Dependency Test
                        # -------------------------
                        npm install --quiet --no-progress
                        ~/snyk test --severity-threshold=medium --json-file-output=${REPORT_DIR}/snyk-report.json 2>&1 | tee ${LOG_DIR}/snyk-dependency.log || true
        
                        echo "=== Snyk Dependency Test Summary ==="
                        jq -r '[.vulnerabilities[].severity] | group_by(.) | map({(.[0]): length}) | add' ${REPORT_DIR}/snyk-report.json || echo "No vulnerabilities found"
                    """
                }
            }
        }

        // stage('Build Docker Image') {
        //     steps {
        //         sh """
        //             set -e
        //             echo '=== Docker Build ===' | tee -a ${LOG_DIR}/docker.log
        //             docker build -t ${DOCKER_TAG_LATEST} -t ${DOCKER_TAG_BUILD} . 2>&1 | tee -a ${LOG_DIR}/docker.log
        //             echo 'Docker image built: ${DOCKER_TAG_LATEST}, ${DOCKER_TAG_BUILD}' | tee -a ${LOG_DIR}/docker.log
        //         """
        //     }
        // }

        stage('Push Docker Image') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'DOCKER_CREDENTIALS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            set -e
                            echo '=== Docker Push ===' | tee -a ${LOG_DIR}/docker.log
                            echo "\${DOCKER_PASS}" | docker login ${DOCKER_REGISTRY} -u "\${DOCKER_USER}" --password-stdin 2>&1 | tee -a ${LOG_DIR}/docker.log
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
            echo "Build completed in ${currentBuild.durationString}"
            archiveArtifacts artifacts: "${LOG_DIR}/**/*, ${REPORT_DIR}/**/*", allowEmptyArchive: true
            cleanWs()
        }
        success { echo 'Pipeline success!' }
        failure { echo 'Pipeline failed!' }
    }
}
