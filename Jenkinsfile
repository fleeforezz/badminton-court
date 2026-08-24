pipeline{
    agent any

    environment {
        APP_NAME = "badminton-court"

        DOCKER_IMAGE = "fleeforezz/badminton-court:latest"

        SERVER_USERNAME = "deployer"
        SERVER_IP = "dev-test01.homelab"
        SERVER_CONNECTION = "${SERVER_USERNAME}" + "@" + "${SERVER_IP}"
    }

    stages{
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ------------------------------------------------------------
        // Build docker image
        // ------------------------------------------------------------
        stage('Docker build') {
            steps {
                sh "docker build --pull -t ${DOCKER_IMAGE} ."
            }
        }

        // ------------------------------------------------------------
        // Push image to Dockerhub
        // ------------------------------------------------------------
        stage('Push image') {
            steps {
                script {
                    withDockerRegistry(credentialsId: 'Docker_Login', url: 'https://index.docker.io/v1/') {
                        sh "docker push ${DOCKER_IMAGE}"
                    }
                }
            }
        }

        // ------------------------------------------------------------
        // Deploy to dev-test01 instance
        // ------------------------------------------------------------
        stage('Deploy') {
            steps {
                sshagent(['production-srv']) {
                    sh"""
                    ssh -o StrictHostKeyChecking=no ${SERVER_CONNECTION} \

                    docker pull ${DOCKER_IMAGE} && 

                    docker stop ${APP_NAME} || true && 
                    docker rm ${APP_NAME} || true &&

                    docker run -d -p 1234:80 \
                    --name ${APP_NAME} \
                    --restart unless-stopped \
                    ${DOCKER_IMAGE}'
                    """
                }
            }
        }
    }
    
    post {
        success{
            withCredentials([string(credentialsId: 'discord-webhook-url', variable: 'DISCORD_WEBHOOK_URL')]) {
                sh '''
                    curl -H "Content-Type: application/json" \
                        -X POST \
                        -d "{\\"content\\":\\"✅ Jenkins job ${JOB_NAME} #${BUILD_NUMBER} deploy successfully: ${BUILD_URL}/\\"}" \
                        "$DISCORD_WEBHOOK_URL"
                '''
            }
        }
        failure{
            withCredentials([string(credentialsId: 'discord-webhook-url', variable: 'DISCORD_WEBHOOK_URL')]) {
                sh '''
                    curl -H "Content-Type: application/json" \
                        -X POST \
                        -d "{\\"content\\":\\"❌ Jenkins job ${JOB_NAME} #${BUILD_NUMBER} failed to deploy: ${BUILD_URL}/\\"}" \
                        "$DISCORD_WEBHOOK_URL"
                '''
            }
        }
        always{
            cleanWs()
        }
    }
}