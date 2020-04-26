FROM cm2network/steamcmd:root

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -y install \
    curl git wget \
    #gcc \
    libstdc++6 \
    #gdb \
    net-tools \
    lib32z1 \
    zlib1g \
    zlibc \
    libtinfo5:i386 \
    unionfs-fuse sudo libcurl4


# Run steamcmd.sh: installs latest Gmod
RUN mkdir /gmod-base /gmod-volume /gmod-union && \
    chown -R steam:steam /gmod-base
USER steam
RUN ${STEAMCMDDIR}/steamcmd.sh +quit
# --build-arg TRIGGER_UPDATE=$(date +%S) will force a rebuild at this step
ARG TRIGGER_UPDATE=initial
RUN ${STEAMCMDDIR}/steamcmd.sh +login anonymous +force_install_dir /gmod-base +app_update 4020 validate +quit
USER root


# Shuffle some libs around optimistically
RUN mkdir -p /root/.steam/sdk32/ && \
    cp -a ${STEAMCMDDIR}/linux32/. /root/.steam/sdk32/
#RUN cp ${STEAMCMDDIR}/linux32/libstdc++.so.6 /gmod-base/bin/ # Seems unnessisary, and prevents loading gmsv_gwsockets_linux.dll

ADD entrypoint.sh /entrypoint.sh
CMD ["/bin/sh", "/entrypoint.sh"]
