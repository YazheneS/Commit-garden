import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../assets");
await mkdir(out, { recursive: true });

const palette = {
  _: [0, 0, 0, 0],
  d: [46, 50, 42, 255],
  b: [117, 75, 48, 255],
  g: [69, 128, 66, 255],
  G: [112, 168, 82, 255],
  l: [164, 198, 103, 255],
  y: [229, 201, 99, 255],
  p: [194, 112, 151, 255],
  P: [235, 170, 196, 255],
  r: [172, 75, 67, 255],
  R: [220, 111, 84, 255],
  c: [76, 154, 134, 255],
  C: [132, 202, 166, 255],
  i: [103, 109, 105, 255],
  I: [160, 166, 156, 255],
  w: [83, 148, 183, 255],
  W: [153, 202, 217, 255],
  s: [189, 154, 103, 255],
  S: [224, 194, 134, 255],
};

const frameKind = new Map();
const set = (id, kind, health = "healthy") => frameKind.set(id, { kind, health });
// Oak: seed, sprout, young, mature/flowering, wilted/dormant variants, special.
[[0,"seed"],[1,"sprout"],[2,"young"],[3,"tree"],[4,"tree"],[5,"bloom"],[6,"bloom"],[7,"special"],[8,"special"],[9,"tree","wilted"],[10,"tree","dormant"],[11,"bloom","wilted"],[12,"bloom","dormant"]].forEach(([id,k,h])=>set(id,k,h));
[[20,"seed"],[21,"sprout"],[22,"young"],[23,"tree"],[24,"tree"],[25,"bloom"],[26,"bloom"],[27,"tree","wilted"],[28,"tree","dormant"],[29,"bloom","wilted"],[30,"bloom","dormant"]].forEach(([id,k,h])=>set(id,k,h));
[[40,"seed"],[41,"sprout"],[42,"mushroom"],[43,"mushroom"],[44,"mushroom","wilted"],[45,"mushroom","dormant"],[46,"mushroom"]].forEach(([id,k,h])=>set(id,k,h));
[[60,"seed"],[61,"sprout"],[62,"cactus"],[63,"cactus"],[64,"cactus","wilted"],[65,"cactus","dormant"],[66,"cactus","wilted"],[67,"cactus","dormant"]].forEach(([id,k,h])=>set(id,k,h));
[[80,"seed"],[81,"sprout"],[82,"flower"],[83,"flower"],[84,"flower","wilted"],[85,"flower","dormant"]].forEach(([id,k,h])=>set(id,k,h));

const plantPixels = (kind, health) => {
  const pixels = new Map();
  const put = (x, y, c) => { if (x >= 0 && x < 32 && y >= 0 && y < 32) pixels.set(`${x},${y}`, c); };
  const row = (y, x1, x2, c) => { for (let x = x1; x <= x2; x++) put(x, y, c); };
  if (kind === "seed") {
    row(25, 12, 19, "b"); row(26, 11, 20, "b"); row(27, 13, 18, "d"); put(13,25,"s");
  } else if (kind === "sprout") {
    row(27, 14, 17, "b"); row(23, 15, 16, "g"); row(22, 11, 15, "G"); row(21, 9, 14, "g"); row(20, 10, 13, "G"); row(22, 16, 20, "G"); row(21, 17, 22, "g"); row(20, 18, 21, "G");
  } else if (kind === "young") {
    row(27, 12, 19, "b"); row(28, 13, 18, "d");
    row(24, 14, 17, "b"); row(21, 14, 17, "b"); row(18, 14, 17, "b"); row(15, 15, 16, "b");
    row(18, 10, 14, "g"); row(16, 11, 15, "G"); row(14, 12, 15, "l"); row(18, 17, 21, "G"); row(16, 17, 20, "g"); row(14, 16, 19, "G");
  } else if (kind === "tree" || kind === "special") {
    row(29, 12, 19, "b"); row(30, 13, 18, "d");
    for (let y = 14; y <= 27; y++) row(y, 14, 17, "b");
    [[7,16,19],[9,12,21],[11,9,23],[13,7,25],[15,5,27],[17,7,25],[19,9,23],[21,11,21]].forEach(([y,x1,x2]) => row(y,x1,x2, health === "wilted" ? "b" : health === "dormant" ? "g" : "g"));
    [[10,14,18],[12,10,22],[14,8,24],[16,7,24],[18,9,22]].forEach(([y,x1,x2]) => { put(x1,y,"G"); put(x2,y,"G"); });
    put(12,12,"l"); put(20,14,"G"); put(11,17,"G");
    if (kind === "special") { put(15,4,"y"); put(16,3,"S"); put(17,4,"y"); put(16,5,"y"); }
    if (health === "wilted") { put(12,13,"b"); put(20,16,"b"); }
    if (health === "dormant") { put(12,13,"l"); put(20,16,"l"); }
  } else if (kind === "bloom" || kind === "flower") {
    row(29, 13, 18, "b"); for (let y = 19; y <= 28; y++) put(15,y,"g");
    row(23, 11, 14, "g"); row(22, 10, 12, "G"); row(25, 17, 20, "g"); row(24, 19, 21, "G");
    const petals = health === "wilted" ? "b" : health === "dormant" ? "l" : "p";
    row(13, 14, 17, petals); row(14, 12, 19, petals); put(15,12,"P"); put(16,11,"y"); put(17,12,"P"); row(15, 14, 17, "y"); row(16, 14, 17, petals); row(17, 15, 16, petals);
  } else if (kind === "mushroom") {
    row(27, 11, 20, "b"); row(28, 12, 19, "d"); row(21, 13, 18, "s"); row(22, 12, 19, "S"); row(20, 10, 21, health === "wilted" ? "b" : "r"); row(19, 12, 19, health === "dormant" ? "s" : "R"); row(18, 14, 17, "r"); put(13,21,"W"); put(18,22,"W");
  } else if (kind === "cactus") {
    row(28, 11, 20, "b"); row(29, 12, 19, "d"); for(let y=12;y<=27;y++) row(y,14,17,health==="wilted"?"g":"c");
    for(let y=17;y<=23;y++) row(y,10,13,"c"); row(16,10,12,"C"); row(15,11,12,"c"); for(let y=19;y<=24;y++) row(y,18,21,"c"); row(18,19,21,"C"); row(17,19,20,"c");
    for(let y=14;y<27;y+=3){ put(13,y,"l"); put(18,y+1,"l"); }
  }
  return pixels;
};

function plantSheet() {
  const width=512,height=192, data=new Uint8Array(width*height*4);
  for (const [frame, entry] of frameKind) {
    const ox=(frame%16)*32, oy=Math.floor(frame/16)*32;
    for (const [point,color] of plantPixels(entry.kind,entry.health)) {
      const [x,y]=point.split(",").map(Number), rgba=palette[color], at=((oy+y)*width+ox+x)*4;
      data.set(rgba,at);
    }
  }
  return png(width,height,data);
}

function terrainSheet() {
  const width=80,height=16, data=new Uint8Array(width*height*4);
  const noise=(tile,x,y)=>{
    let n=(Math.imul(x+1,0x1f123bb5)^Math.imul(y+3,0x5f356495)^Math.imul(tile+11,0x6c8e9cf5))>>>0;
    n=Math.imul(n^(n>>>15),0x2c1b3c6d);n=Math.imul(n^(n>>>12),0x297a2d39);
    return((n^(n>>>15))>>>0)%100;
  };
  const tilePixel=(tile,x,y)=>{
    const n=noise(tile,x,y);
    if(tile===0)return n<7?"l":n<35?"G":"g";
    if(tile===1)return n<12?"d":n<35?"s":"b";
    if(tile===2)return n<23?"S":n<30?"b":"s";
    if(tile===3)return ((y===4||y===11)&&x>1&&x<14&&x%5!==0)?"W":n<18?"W":"w";
    return ((x===0||x===15||y===0||y===15)?"d":n<13?"I":n<22?"i":"i");
  };
  for(let tile=0;tile<5;tile++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const rgba=palette[tilePixel(tile,x,y)],at=(y*width+tile*16+x)*4;
    data.set(rgba,at);
  }
  return png(width,height,data);
}

await writeFile(resolve(out,"plants.png"),plantSheet());
await writeFile(resolve(out,"terrain.png"),terrainSheet());

function png(width,height,rgba) {
  const crcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const name=Buffer.from(type),size=Buffer.alloc(4);size.writeUInt32BE(data.length);const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([size,name,data,checksum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const raw=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)raw.set(rgba.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
