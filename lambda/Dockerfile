FROM amazon/aws-lambda-nodejs:16

# installing Java/OpenJDK for Allure
ENV OPEN_JDK=java-1.8.0-openjdk
ENV JAVA_HOME=/usr/lib/jvm/__openjdk/jre

RUN yum install ${OPEN_JDK} -y
RUN mkdir -p /usr/lib/jvm/__openjdk
RUN ln -s $(rpm -ql ${OPEN_JDK} | head -n 1 | awk -F'/bin' '{print $1}') /usr/lib/jvm/__openjdk/jre

# adding lambda application
COPY app.js package*.json ./
RUN npm install

CMD [ "app.handler" ]