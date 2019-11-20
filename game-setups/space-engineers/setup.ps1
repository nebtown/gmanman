$torchUrl = "https://build.torchapi.net/job/Torch/job/Torch/job/master/lastSuccessfulBuild/artifact/bin/torch-server.zip"

$client = new-object System.Net.WebClient
$client.DownloadFile($torchUrl, "torch-server.zip")

Expand-Archive torch-server.zip -DestinationPath .
