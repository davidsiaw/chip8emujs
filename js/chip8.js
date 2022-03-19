function Canvas(id)
{
  var div = document.getElementById(id);
  var canvas = document.createElement('canvas');

  canvas.id = "screen";
  canvas.width = div.clientWidth;
  canvas.height = div.clientHeight;

  canvas.style.zIndex = 8;

  div.appendChild(canvas);

  var ctx = canvas.getContext('2d');

  var colors = ['black', 'white'];

  this.update = function(fb)
  {
    for (var y=0; y<32; y++)
    for (var x=0; x<64; x++)
    {
      var value = fb[y * 64 + x];
      ctx.fillStyle = colors[value];
      ctx.fillRect(x * 8, y * 8, 8, 8);
    }
  }

  return this;
}

function Beeper()
{
  let a = new AudioContext()
  function k(w,x,y){
    //console.log("Gain:"+w, "Hz:"+x, "ms:"+y)
    var v = a.createOscillator()
    var u = a.createGain()
    v.connect(u)
    v.frequency.value = x
    v.type = "sine"
    u.connect(a.destination)
    u.gain.value = w * 0.01
    return v;
  }

  var osc = null;
  this.beep = function(beep)
  {
    if (beep > 0 && osc === null)
    {
      osc = k(10,800,1000);
      osc.start(a.currentTime);
    }
    else if (beep == 0 && osc !== null)
    {
      osc.stop(a.currentTime + 0.001)
      osc = null;
    }
  }

  return this;
}

function Executor(instruction, machine)
{
  var opcode = instruction >> 12;
  var nnn    = instruction & 0xfff;
  var kk     = instruction &  0xff;
  var n      = instruction &   0xf;

  var x      = nnn >> 8;
  var y      =  kk >> 4;

  var r = machine.registers(); // register file

  var clist = [];
  clist[0x0] = function()
  {
    if (nnn === 0x0e0)
    {
      console.log("CLS")
      machine.clear_display();
    }
    else if (nnn === 0x0ee)
    {
      console.log("RET")
      machine.return();
    }
    else
    {
      console.log("SYS", nnn.toString(16));
      // ignored
    }
  }

  clist[0x1] = function()
  {
    console.log("JP", nnn.toString(16));
    machine.jump(nnn);
  }

  clist[0x2] = function()
  {
    console.log("CALL", nnn.toString(16));
    machine.call(nnn);
  }

  clist[0x3] = function()
  {
    console.log("SE",
      "V" + x.toString(16),
      kk.toString(16));

    if (r[x] === kk)
    {
      machine.skip();
    }
  }

  clist[0x4] = function()
  {
    console.log("SNE",
      "V" + x.toString(16),
      kk.toString(16));

    if (r[x] !== kk)
    {
      machine.skip();
    }
  }

  clist[0x5] = function()
  {
    console.log("SE",
      "V" + x.toString(16),
      "V" + y.toString(16));

    if (r[x] === r[y])
    {
      machine.skip();
    }
  }

  clist[0x6] = function()
  {
    console.log("LD",
      "V" + x.toString(16), kk.toString(16));

    r[x] = kk;
  }

  clist[0x7] = function()
  {
    console.log("ADD",
      "V" + x.toString(16), kk.toString(16));

    r[x] += kk;
  }

  var ops8 = [];
  var op8 = [];

  ops8[0x0] = "LD";
  op8[0x0] = function() {r[x] = r[y];}

  ops8[0x1] = "OR";
  op8[0x1] = function() {r[x] |= r[y];}

  ops8[0x2] = "AND";
  op8[0x2] = function() {r[x] &= r[y];}

  ops8[0x3] = "XOR";
  op8[0x3] = function() {r[x] ^= r[y];}

  ops8[0x4] = "ADD";
  op8[0x4] = function() {
    var a = r[x] + r[y];
    r[0xf] = a > 0xff ? 1 : 0;
    r[x] = a & 0xff;
  }

  ops8[0x5] = "SUB";
  op8[0x5] = function() {
    var a = r[x] - r[y];
    r[0xf] = a < 0 ? 0 : 1;
    r[x] = a & 0xff;
  }

  ops8[0x6] = "SHR";
  op8[0x6] = function() {
    var a = r[x] >> 1;
    r[0xf] = r[x] & 0x1
    r[x] = a & 0xff;
  }

  ops8[0x7] = "SUBN";
  op8[0x7] = function() {
    var a = r[y] - r[x];
    r[0xf] = a < 0 ? 0 : 1;
    r[x] = a & 0xff;
  }

  ops8[0xE] = "SHL";
  op8[0xE] = function() {
    var a = r[x] << 1;
    r[0xf] = r[x] >> 7;
    r[x] = a & 0xff;
  }

  clist[0x8] = function()
  {
    if(ops8[n] === undefined)
    {
      ops8[n] = "???0x8";
    }
    console.log(ops8[n],
      "V" + x.toString(16),
      "V" + y.toString(16));

    op8[n]();
  }

  clist[0x9] = function()
  {
    console.log("SNE", 
      "V" + x.toString(16), 
      "V" + y.toString(16));

    if (r[x] !== r[y])
    {
      machine.skip();
    }
  }

  clist[0xA] = function()
  {
    console.log("LD I", nnn.toString(16));
    machine.setI(nnn);
  }

  clist[0xB] = function()
  {
    console.log("JP V0", nnn.toString(16));
    machine.jump(nnn + r[0]);
  }

  clist[0xC] = function()
  {
    console.log("RND",
      "V" + x.toString(16),
      kk.toString(16));
  }

  clist[0xD] = function()
  {
    console.log("DRW",
        "V" + x.toString(16),
        "V" + y.toString(16),
        n.toString(16)
    )

    var collision = false;
    for(var idx=0; idx<n; idx++) // foreach row
    {
      var byte = machine.memory()[idx + machine.getI()];
      //console.log("drawbyte", byte.toString(16))
      for(var bit=0; bit<8; bit++)
      {
        var xpos = r[x]+bit;
        var ink = (byte >> (7-bit)) & 0x1;
        var pix = machine.getpixel(xpos,r[y]+idx);

        collision |= (pix === 1 && ink === 1)

        //console.log("pix", pix, ink, pix ^ ink)

        machine.setpixel(xpos,r[y]+idx, pix ^ ink)
      }
    }

    if (collision)
    {
      r[0xF] = 1;
    }
    else
    {
      r[0xF] = 0;
    }
  }

  clist[0xE] = function()
  {
    if (kk === 0x9e)
    {
      console.log("SKP", "V" + n.toString(16))
    }
    else if (kk === 0xa1)
    {
      console.log("SKNP", "V" + n.toString(16))
    }
    else
    {
      console.log("???0xE")
    }
  }

  var opF = [];
  opF[0x07] = function() {
    console.log("LD", "V" + x.toString(16), "DT")
    r[x] = machine.get_delay_timer();
  }

  opF[0x0A] = function() {
    console.log("LD", "V" + x.toString(16), "K")
    // wait flag
  }

  opF[0x15] = function() {
    console.log("LD", "DT", "V" + x.toString(16))
    machine.set_delay_timer(r[x]);
    
  }

  opF[0x18] = function() {
    console.log("LD", "ST", "V" + x.toString(16))
    machine.set_sound_timer(r[x]);
    
  }

  opF[0x1E] = function() {
    console.log("ADD", "I", "V" + x.toString(16))
    machine.setI(machine.getI() + r[x]);
  }

  opF[0x29] = function() {
    console.log("LD", "F", "V" + x.toString(16))
    machine.setI(r[x] * 5);
    
  }

  opF[0x33] = function() {
    console.log("LD", "B", "V" + x.toString(16))

    var ir = machine.getI();
    machine.memory()[ir+0] = Math.floor(r[x]/100);
    machine.memory()[ir+1] = Math.floor(r[x]/10) % 10;
    machine.memory()[ir+2] = r[x] % 10;
  }

  opF[0x55] = function() {
    console.log("LD", "[I]", "V" + x.toString(16))
    if (x > 7)
    {
      x = 7;
    }
    for(var i=0;i<=x;i++)
    {
      machine.memory()[machine.getI() + i] = r[i];
    }
    // machine.setI(machine.getI() + x + 1);
  }

  opF[0x65] = function() {
    console.log("LD", "V" + x.toString(16), "[I]")
    if (x > 7)
    {
      x = 7;
    }
    for(var i=0;i<=x;i++)
    {
      r[i] = machine.memory()[machine.getI() + i];
    }
    // machine.setI(machine.getI() + x + 1);
    
  }

  clist[0xF] = function()
  {
    var op = kk;
    opF[op]();
  }

  this.execute = function()
  {
    clist[opcode]();
  }

  return this;
}

function Chip8(screen, code)
{
  var machine = this;
  function increment_pc()
  {
    pc += 2;
    if(pc > 0xfff)
    {
      clearInterval(clock);
    }
  }

  function load_font()
  {
    var font = new Uint8Array([
      0xF0, 0x90, 0x90, 0x90, 0xF0, //0
      0x20, 0x60, 0x20, 0x20, 0x70, //1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, //2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, //3
      0x90, 0x90, 0xF0, 0x10, 0x10, //4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, //5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, //6
      0xF0, 0x10, 0x20, 0x40, 0x40, //7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, //8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, //9
      0xF0, 0x90, 0xF0, 0x90, 0x90, //A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, //B
      0xF0, 0x80, 0x80, 0x80, 0xF0, //C
      0xE0, 0x90, 0x90, 0x90, 0xE0, //D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, //E
      0xF0, 0x80, 0xF0, 0x80, 0x80  //F
    ]);

    for(var i=0; i<font.length; i++)
    {
      memory[i] = font[i];
    }
  }

  function load_code()
  {
    for(var i=0; i<code.length; i++)
    {
      memory[i + 0x200] = code[i];
    }
  }

  function setup_beep_key()
  {
    window.addEventListener("keydown", event => {
      if (event.isComposing || event.keyCode === 16) {
        // console.log('beepkeydown')
        beepkey = 1
        return;
      }
    });

    window.addEventListener("keyup", event => {
      if (event.isComposing || event.keyCode === 16) {
        // console.log('beepkeyup')
        beepkey = 0
        return;
      }
    });
  }

  function current_instruction()
  {
    return (memory[pc] << 8) + (memory[pc + 1]);
  }

  function decrement_timers()
  {
    if (timers[0] > 0)
    {
      timers[0] -= 1;
    }

    if (timers[1] > 0)
    {
      timers[1] -= 1;
    }
  }

  function beep()
  {
    beeper.beep(timers[1]);
  }

  function tick()
  {
    var executor = new Executor(current_instruction(), machine);
    executor.execute();
    increment_pc();
    beep();
    decrement_timers();
    screen.update(fb);
    console.log(
      pc.toString(16),":",
      "I",ir.toString(16),",",
      "V0",registers[0x0].toString(16),",",
      "V1",registers[0x1].toString(16),",",
      "V2",registers[0x2].toString(16),",",
      "V3",registers[0x3].toString(16),",",
      "V4",registers[0x4].toString(16),",",
      "V5",registers[0x5].toString(16),",",
      "V6",registers[0x6].toString(16),",",
      "V7",registers[0x7].toString(16),",",
      "V8",registers[0x8].toString(16),",",
      "V9",registers[0x9].toString(16),",",
      "VA",registers[0xA].toString(16),",",
      "VB",registers[0xB].toString(16),",",
      "VC",registers[0xC].toString(16),",",
      "VD",registers[0xD].toString(16),",",
      "VE",registers[0xE].toString(16),",",
      "VF",registers[0xF].toString(16),",",
    );

    if (pc === 0x30e) { clearInterval(clock); }
  }

  this.clear_display = function()
  {
    fb.fill(0)
  }

  this.return = function()
  {
    pc = stack[stackptr] - 2;
    if (stackptr > 0)
    {
      throw 'nothing to return to'
    }
  }

  this.jump = function(pos)
  {
    pc = pos - 2; // So the next increment happens correctly.
  }

  this.call = function(pos)
  {
    stackptr += 1;
    stack[stackptr] = pc;
    pc = pos - 2;
  }

  this.skip = increment_pc;

  this.registers = function()
  {
    return registers;
  }

  this.getI = function()
  {
    return ir;
  }

  this.setI = function(value)
  {
    ir = value & 0xfff;
  }

  this.getpixel = function(x,y)
  {
    return (fb[(x % 64) + (y % 32) * 64]);
  }

  this.setpixel = function(x,y,v)
  {
    fb[(x % 64) + (y % 32) * 64] = v & 0x1;
  }

  this.memory = function()
  {
    return memory;
  }

  this.keys = function()
  {
    return key_flags;
  }

  this.get_delay_timer = function()
  {
    return timers[0];
  }

  this.set_delay_timer = function(val)
  {
    timers[0] = val;
  }

  this.get_sound_timer = function()
  {
    return timers[1];
  }

  this.set_sound_timer = function(val)
  {
    timers[1] = val;
  }

  var registers = new Uint8Array(0x10);
  var key_flags = new Uint8Array(0x10);

  var timers = new Uint8Array(2); // 0=DT 1=ST

  var stack = new Uint16Array(32);
  var stackptr = 0;

  var pc = 0x200;   // program counter
  var ir = 0;       // I or address register
  var memory = new Uint8Array(0x1000);

  var fb = new Uint8Array(64 * 32);

  var beepkey = -1;
  setup_beep_key();

  load_font();
  load_code();

  var beeper = new Beeper();

  var clock = setInterval(tick, 16);

  return this;
}

function start(code)
{
  var screen = new Canvas('canvas');
  var chip8 = new Chip8(screen, code);
}

// Dropping the file into the blue box starts the VM
function dragOverHandler(ev) {
  console.log('File(s) in drop zone');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

function dropHandler(ev) {
  console.log('File(s) dropped');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        //console.log('... file[' + i + '].name = ' + file.name);

        var reader = new FileReader();
        reader.onload = function() {

          var arrayBuffer = this.result,
            array = new Uint8Array(arrayBuffer),
            binaryString = String.fromCharCode.apply(null, array);

          console.log("read complete")
          console.log(array);
          start(array);

        }
        reader.readAsArrayBuffer(file);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      // console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
      console.log('dataTransfer');
    }
  }
}
