####
# Build image
####

FROM openjdk:11-jre

RUN apt update && apt install -y git

# Put saved artifacts in /tmp/include
RUN mkdir /build /tmp/include
WORKDIR /build
RUN wget https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar -O /build/BuildTools.jar
RUN java -jar BuildTools.jar
RUN cp spigot*.jar /tmp/include/spigot.jar && \
	cp Spigot/Spigot-API/target/spigot-api*SNAPSHOT.jar /tmp/include/spigot-api.jar



####
# Actual image
####

FROM openjdk:11-jre

RUN apt update && apt dist-upgrade -y

COPY --from=0 /tmp/include /tmp/include
RUN mkdir minecraft && \
	echo eula=true > /minecraft/eula.txt

WORKDIR /minecraft
COPY ./start.sh /

ENTRYPOINT ["/bin/bash", "/start.sh"]
