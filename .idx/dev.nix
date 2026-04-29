{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_22
  ];

  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];

    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "run" "dev:light:host" ];
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };
  };
}
