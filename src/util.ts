export function GetServerID() {
  const ServerID =
    new URL(window.location.href).searchParams.get("ServerID") ?? "";
  return ServerID;
}
