param([Parameter(Mandatory=$true)][string]$Spec)
$ErrorActionPreference = 'Stop'
# A kernel job owns only this invocation's process tree. Creating the child
# suspended closes the spawn/assignment race; closing the job kills descendants.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class HarnessJob {
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT {
    public long a,b; public uint flags; public UIntPtr min,max; public uint count;
    public UIntPtr affinity; public uint priority,scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct LIMIT {
    public BASIC_LIMIT basic; public IO_COUNTERS io; public UIntPtr a,b,c,d;
  }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUP {
    public uint cb; public string reserved,desktop,title;
    public uint x,y,xs,ys,xc,yc,fill,flags; public ushort show,reserved2;
    public IntPtr reserved3,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS {
    public IntPtr process,thread; public uint pid,tid;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern IntPtr CreateJobObject(IntPtr attr, string name);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool SetInformationJobObject(IntPtr job, int type, ref LIMIT value, uint size);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool QueryInformationJobObject(IntPtr job, int type, IntPtr value, uint size, IntPtr returned);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta,
    bool inherit, uint flags, IntPtr env, string cwd, ref STARTUP start, out PROCESS process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint ms);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int which);
  static string Quote(string value) {
    var result = new StringBuilder("\""); int slashes=0;
    foreach(char c in value) {
      if(c=='\\') { slashes++; continue; }
      if(c=='"') { result.Append('\\', slashes*2+1); result.Append(c); }
      else { result.Append('\\', slashes); result.Append(c); }
      slashes=0;
    }
    result.Append('\\', slashes*2); result.Append('"'); return result.ToString();
  }
  public static int Run(string executable, string[] args, string cwd) {
    IntPtr job=CreateJobObject(IntPtr.Zero,null);
    if(job==IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
    PROCESS child=new PROCESS();
    try {
      LIMIT limits=new LIMIT(); limits.basic.flags=0x2000;
      if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(limits))) throw new System.ComponentModel.Win32Exception();
      var command=new StringBuilder(Quote(executable));
      foreach(string arg in args) command.Append(" ").Append(Quote(arg));
      STARTUP start=new STARTUP(); start.cb=(uint)Marshal.SizeOf(start); start.flags=0x100;
      start.input=GetStdHandle(-10); start.output=GetStdHandle(-11); start.error=GetStdHandle(-12);
      if(!CreateProcess(executable,command,IntPtr.Zero,IntPtr.Zero,true,4,IntPtr.Zero,cwd,ref start,out child)) throw new System.ComponentModel.Win32Exception();
      if(!AssignProcessToJobObject(job,child.process)) {
        TerminateProcess(child.process,1); throw new System.ComponentModel.Win32Exception();
      }
      if(ResumeThread(child.thread)==0xffffffff) { TerminateProcess(child.process,1); throw new System.ComponentModel.Win32Exception(); }
      WaitForSingleObject(child.process,0xffffffff);
      uint code; GetExitCodeProcess(child.process,out code);
      IntPtr accounting=Marshal.AllocHGlobal(48);
      try {
        if(!QueryInformationJobObject(job,1,accounting,48,IntPtr.Zero)) throw new System.ComponentModel.Win32Exception();
        if(Marshal.ReadInt32(accounting,40)>0) {
          Console.Error.WriteLine("HARNESS_CHILD_LEAK: process left live descendants");
          return 1;
        }
      } finally { Marshal.FreeHGlobal(accounting); }
      return unchecked((int)code);
    } finally {
      if(child.thread!=IntPtr.Zero) CloseHandle(child.thread);
      if(child.process!=IntPtr.Zero) CloseHandle(child.process);
      CloseHandle(job);
    }
  }
}
'@
try {
  $InvocationSpec = Get-Content -LiteralPath $Spec -Raw -Encoding UTF8 | ConvertFrom-Json
  $InvocationExitCode = [HarnessJob]::Run($InvocationSpec.executable, [string[]]$InvocationSpec.args, $InvocationSpec.cwd)
  exit $InvocationExitCode
} catch {
  [Console]::Error.WriteLine("HARNESS_JOB_ERROR: " + $_.Exception.Message)
  exit 1
}
