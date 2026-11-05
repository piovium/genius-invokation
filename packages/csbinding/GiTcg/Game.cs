// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

namespace GiTcg;
using System.Runtime.InteropServices;
using System.Text;
using Google.Protobuf;

unsafe struct Handlers(IPlayer player)
{
  [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
  delegate void NotificationHandler(void* data, byte* msg_ptr, nuint msg_len);

  [UnmanagedFunctionPointer(CallingConvention.Cdecl)]

  delegate void RpcHandler(void* data, byte* req_ptr, nuint req_len, byte* res_ptr, nuint* res_len);

  [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
  delegate void IoErrorHandler(void* data, byte* msg);

  // Native function pointers do not keep their managed delegates alive.
  static readonly NotificationHandler notificationHandlerDelegate = StaticOnNotification;
  static readonly RpcHandler rpcHandlerDelegate = StaticOnRpc;
  static readonly IoErrorHandler ioErrorHandlerDelegate = StaticOnIoError;

  public static readonly delegate* unmanaged[Cdecl]<void*, byte*, nuint, void> notification_handler = (delegate* unmanaged[Cdecl]<void*, byte*, nuint, void>)Marshal.GetFunctionPointerForDelegate(notificationHandlerDelegate);
  public static readonly delegate* unmanaged[Cdecl]<void*, byte*, nuint, byte*, nuint*, void> rpc_handler = (delegate* unmanaged[Cdecl]<void*, byte*, nuint, byte*, nuint*, void>)Marshal.GetFunctionPointerForDelegate(rpcHandlerDelegate);
  public static readonly delegate* unmanaged[Cdecl]<void*, byte*, void> io_error_handler = (delegate* unmanaged[Cdecl]<void*, byte*, void>)Marshal.GetFunctionPointerForDelegate(ioErrorHandlerDelegate);

  static void StaticOnNotification(void* data, byte* msg_ptr, nuint msg_len)
  {
    var obj = (Handlers?)GCHandle.FromIntPtr((IntPtr)data).Target;
    obj?.OnNotification(msg_ptr, msg_len);
  }
  static void StaticOnRpc(void* data, byte* req_ptr, nuint req_len, byte* res_ptr, nuint* res_len)
  {
    var obj = (Handlers?)GCHandle.FromIntPtr((IntPtr)data).Target;
    obj?.OnRpc(req_ptr, req_len, res_ptr, res_len);
  }
  static void StaticOnIoError(void* data, byte* msg)
  {
    var obj = (Handlers?)GCHandle.FromIntPtr((IntPtr)data).Target;
    obj?.OnIoError(msg);
  }

  readonly IPlayer player = player;

  public readonly void OnNotification(byte* msg_ptr, nuint msg_len)
  {
    var span = new Span<byte>(msg_ptr, (int)msg_len);
    var notification = Proto.Notification.Parser.ParseFrom(span);
    player.OnNotification(notification);
  }

  public readonly void OnRpc(byte* req_ptr, nuint req_len, byte* res_ptr, nuint* res_len)
  {
    var req_span = new Span<byte>(req_ptr, (int)req_len);
    var request = Proto.Request.Parser.ParseFrom(req_span);
    var response = new Proto.Response();
    if (request.RerollDice is not null)
    {
      response.RerollDice = player.OnRerollDice(request.RerollDice);
    }
    else if (request.ChooseActive is not null)
    {
      response.ChooseActive = player.OnChooseActive(request.ChooseActive);
    }
    else if (request.SwitchHands is not null)
    {
      response.SwitchHands = player.OnSwitchHands(request.SwitchHands);
    }
    else if (request.Action is not null)
    {
      response.Action = player.OnAction(request.Action);
    }
    else if (request.SelectOption is not null)
    {
      response.SelectOption = player.OnSelectOption(request.SelectOption);
    }
    else if (request.SelectCard is not null)
    {
      response.SelectCard = player.OnSelectCard(request.SelectCard);
    }
    else
    {
      throw new InvalidOperationException("Unknown request");
    }
    var res_bytes = response.ToByteArray();
    Marshal.Copy(res_bytes, 0, (IntPtr)res_ptr, res_bytes.Length);
    *res_len = (nuint)res_bytes.Length;
  }

  public readonly void OnIoError(byte* msg)
  {
    var error_msg = Encoding.UTF8.GetString(MemoryMarshal.CreateReadOnlySpanFromNullTerminated(msg));
    player.OnIoError(error_msg);
  }
}


// TODO
public interface IPlayer
{
  void OnNotification(Proto.Notification notification);
  Proto.RerollDiceResponse OnRerollDice(Proto.RerollDiceRequest request);
  Proto.ChooseActiveResponse OnChooseActive(Proto.ChooseActiveRequest request);
  Proto.SwitchHandsResponse OnSwitchHands(Proto.SwitchHandsRequest request);
  Proto.ActionResponse OnAction(Proto.ActionRequest request);
  Proto.SelectCardResponse OnSelectCard(Proto.SelectCardRequest request);
  Proto.SelectOptionResponse OnSelectOption(Proto.SelectOptionRequest request) => new() { SelectedIndex = 0 };
  void OnIoError(string error_msg);
}

public enum GameStatus
{
  NotStarted = 0,
  Running = 1,
  Finished = 2,
  Aborted = 3,
}

public class Game : ObjBase, IDisposable
{
  internal readonly IntPtr handle;
  private bool disposed = false;
  readonly GCHandle?[] handlers_gc_handles = [null, null];

  public Game(State state)
  {
    unsafe
    {
      gitcg_game* game;
      var ret = NativeMethods.gitcg_game_new((gitcg_state*)state.handle, &game);
      if (ret != 0)
      {
        throw new Exception("Failed to create game");
      }
      handle = (IntPtr)game;
    }
  }

  public void SetPlayer(int who, IPlayer player)
  {
    if (who != 0 && who != 1)
    {
      throw new ArgumentOutOfRangeException(nameof(who));
    }
    var handlers = new Handlers(player);
    var gc_handle = GCHandle.Alloc(handlers);
    handlers_gc_handles[who]?.Free();
    handlers_gc_handles[who] = gc_handle;
    unsafe
    {
      var game = (gitcg_game*)handle;
      NativeMethods.gitcg_game_set_player_data(game, who, (void*)GCHandle.ToIntPtr(gc_handle));
      NativeMethods.gitcg_game_set_notification_handler(game, who, Handlers.notification_handler);
      NativeMethods.gitcg_game_set_rpc_handler(game, who, Handlers.rpc_handler);
      NativeMethods.gitcg_game_set_io_error_handler(game, who, Handlers.io_error_handler);
    }
  }

  public void Start()
  {
    if (Status() != GameStatus.NotStarted)
    {
      throw new InvalidOperationException("Game has already started");
    }
    unsafe
    {
      var game = (gitcg_game*)handle;
      var ret = NativeMethods.gitcg_game_step(game);
      if (ret != 0)
      {
        throw new Exception("Failed to start game");
      }
    }
  }

  public void Step()
  {
    if (Status() != GameStatus.Running)
    {
      throw new InvalidOperationException("Game is not running");
    }
    unsafe
    {
      var game = (gitcg_game*)handle;
      var ret = NativeMethods.gitcg_game_step(game);
      if (ret != 0)
      {
        throw new Exception("Failed to step game");
      }
    }
  }

  public GameStatus Status()
  {
    unsafe
    {
      var game = (gitcg_game*)handle;
      int status = 0;
      _ = NativeMethods.gitcg_game_get_status(game, &status);
      return (GameStatus)status;
    }
  }

  public bool Running { get => Status() == GameStatus.Running; }

  public State State()
  {
    unsafe
    {
      var game = (gitcg_game*)handle;
      gitcg_state* state;
      int ret = NativeMethods.gitcg_game_get_state(game, &state);
      if (ret != 0)
      {
        throw new Exception("Failed to get state");
      }
      return new State((IntPtr)state);
    }
  }

  public void Dispose()
  {
    Dispose(disposing: true);
    GC.SuppressFinalize(this);
  }
  private void Dispose(bool disposing)
  {
    if (!disposed)
    {
      if (disposing)
      {
        // dispose managed resources here
      }
      foreach (var gc_handle in handlers_gc_handles)
      {
        gc_handle?.Free();
      }
      unsafe
      {
        _ = NativeMethods.gitcg_state_free((gitcg_state*)handle);
      }
    }
    disposed = true;
  }
  ~Game()
  {
    Dispose(disposing: false);
  }
}
