{pkgs}: {
  deps = [
    pkgs.postgresql
    pkgs.psmisc
    pkgs.lsof
    pkgs.nodejs
    pkgs.nodePackages.typescript-language-server
  ];
}
