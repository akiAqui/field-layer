import p5 from 'p5';
import * as Tone from 'tone';
//import kdTree from '../lib/kd-tree-javascript/kdTree.js';


new p5( (sketch) => {
    // p5.jsライブラリを使用
    let particles = []; // 一次元配列
    let matrix = [];    // 実際は二次元配列
    let quarks = [];
    let stime =0;
    const THIS=1000; // highlighted
    let mode=0;
    const maxmode=1;
    let isAwaitingInput = false;
    let debflag=false;
    
    function keyPressed() {
	if (key === 's' || key === 'S') {  // 「s」または「S」が押された場合
	    loop();  // アニメーションを再開
	}
    }
    // 定数のセット
    const CONSTANTS = [
	{
	    dt: 0.1,   // シミュレーション実施の時間ステップの大きさ
	    g:  20.0,
	    L: 1000,    // 空間の縦横の長さでありキャンバスの横の長さ
	    m: 10.0,    // 粒子P,Nの重さ
	    R: 10.0,   // 粒子P,Nの半径
	    Np0: 20,   // 初期状態のP粒子の数
	    Nn0: 10,   // 初期状態のN粒子の数
	    e: 2,
	    Nm: 5000,
	    Nq: 5000,
	    X: 100,    // 粒子発生の閾値
	    Emin: 1,
	    rmin: 4,
	    c: 2,
	    D: 1.0,
	    alpha: 5.0,
	    beta: 0.5,
	    gamma: 1.0,
	    Re: 20,
	    ro1: 1.0,
	    ro2: 1.0,
	    f: 10.0,
	    Ra: 500,        //半径Raの円内に所属する異種のNc個の粒子のみを考慮対象とする
	    Rr: 1000,       //半径Rrの円内に所属する同種のNb個の粒子のみを考慮対象とする
	    Rar: 220,
	    DRAW_q: true,
	    k: 10,
	},
	{
	    dt: 0.01,
	    L: 400,
	    m: 1.0,
	    R: 3.0,
	    Np0: 10,
	    Nn0: 5,
	    e: 2,
	    Nm: 5000,
	    Nq: 5000,
	    X: 100,
	    Emin: 1,
	    rmin: 4,
	    c: 20,
	    D: 1.0,
	    alpha: 5.0,
	    beta: 0.5,
	    gamma: 1.0,
	    Re: 20,
	    ra1: 10.0,
	    ra2: 10.0,
	    f: 20,
	    Ra: 20,
	    Rr: 30,
	    DRAW_q: true,
	    k: 10,
	},
    ];
    
    let c = CONSTANTS[0]; // デフォルトで1番目の定数セットを使用
    let g;
    
    // 色の定義
    let COLOR_POSITIVE    = sketch.color(0, 0, 0); //sketch.color(255, 0, 0);
    let COLOR_NEGATIVE    = sketch.color(0, 0, 0); //sketch.color(0, 0, 255);
    const COLOR_HIGHLIGHTED = sketch.color(0,255,0);
    let COLOR_ZERO        = sketch.color(255, 255, 255);
    let COLOR_mu          = sketch.color(255, 165, 140);
    let COLOR_qi          = sketch.color(100, 128, 20);
    let BACKGROUND        = sketch.color(0,0,0);
    
    let pindex=0;
    // 粒子クラスの定義

    class Particle {
	constructor(x,y,type) {
	    this.charge=Math.random()*2+5;
	    this.index=pindex++;
            this.pos = {x:x,y:y};
	    this.vel = {vx:0,vy:0};
	    this.acc = {ax:0,ay:0};
	    this.force = {x:0,y:0};
	    this.flag = type === 'P' ? 1.0 : -1.0;
            this.energy = Math.random()*c.X*32;
	    this.theta = Math.random()*sketch.TWO_PI;
            this.vel.vx = Math.sqrt(2.0*this.energy/c.m)*Math.cos(this.theta*this.flag);
            this.vel.vy = Math.sqrt(2.0*this.energy/c.m)*Math.sin(this.theta*this.flag);
	    //if (Number.isNaN(this.vy)) {console.log("i:",this.index," theta=",this.theta," vy is NaN");}
            this.type = type;
            this.radius = c.R+this.theta*8;
            this.mass = c.m;
            this.color = type === 'P' ? COLOR_POSITIVE : COLOR_NEGATIVE;
	    if (this.index===THIS) this.color = COLOR_HIGHLIGHTED;
            if (typeof this.pos.x === 'undefined' || typeof this.pos.y === 'undefined') {
		throw new Error("x or y is undefined");
            }
            if (isNaN(this.vel.vx) || isNaN(this.vel.vy)) {
		throw new Error("vx or vy is NaN at constructor");
            }	    
	}
	logging(index=this.index,memo=''){
	    if (this.index===index) {
		if (typeof this.pos.x === 'undefined' || typeof this.pos.y === 'undefined') {
		    throw new Error("x or y is undefined @",memo);
		}
		if (isNaN(this.pos.x) || isNaN(this.pos.y)) {
		    console.log("memo=",memo);
		    throw new Error("x or y is NaN @",memo,"index=",index);
		}	    
		
		console.group("logging",memo,":",this.index);
		console.log("time:",stime);
		console.log("index:",this.index," type:",this.type," flag:",this.flag);		
		console.log("x=",this.pos.x);
		console.log("y=",this.pos.y);
		console.log("vx=",this.vel.vx);
		console.log("vy=",this.vel.vy);
		console.log("ax=",this.acc.ax);
		console.log("ay=",this.acc.ay);
		console.log("fx=",this.force.x);
		console.log("fy=",this.force.y);
		console.log("frx=",this.vel.vx*this.vel.vx*c.f);
		console.log("fry=",this.vel.vy*this.vel.vy*c.f);
		
		console.log("energy=",this.energy);		
		console.groupEnd("Particle.constructor");		
	    }
	}
	updatePosition(){
	    //this.logging(THIS, "updatePosition begin");
            this.pos.x += this.vel.vx * c.dt;
            this.pos.y += this.vel.vy * c.dt;
            if (this.pos.x < 0) this.pos.x += c.L;
            if (this.pos.x > c.L) this.pos.x -= c.L;
            if (this.pos.y < 0) this.pos.y += c.L;
            if (this.pos.y > c.L) this.pos.y -= c.L;
	    //this.logging(THIS, "updatePosition end");	    
	}
	updateVelocity(){
            this.vel.vx += this.acc.ax * c.dt;
            this.vel.vy += this.acc.ay * c.dt;
	}
	updateEnergy(){
	    this.energy = this.mass/2.0 * Math.sqrt(this.vel.vx*this.vel.vx + this.vel.vy*this.vel.vy);
	}
	updateAcceleration(){
	    //this.logging(THIS,'acceleration 1');
            this.acc.ax = this.force.x / this.mass;
            this.acc.ay = this.force.y / this.mass;
	    //this.logging(THIS,"acceleration 2");
	}
	updateColor() {
	    // 0.0001 - 1.2
            const ratio = this.type === 'P' ? this.energy / (c.X * 2) : this.energy / (c.X);
	    // for color RGB
            //this.color = sketch.lerpColor(COLOR_ZERO, this.type === 'P' ? COLOR_POSITIVE : COLOR_NEGATIVE, ratio);
	    // for grayScale
	    this.color= BACKGROUND>127.5 ?
		127.5 + (BACKGROUND-127.5)*Math.min(ratio, 1.0) : 127.5-(127.5-BACKGROUND)*Math.min(ratio, 1.0);
	    //this.color=ratio*BACKGROUND > 255 ? ratio*BACKGROUND -255 : ratio*BACKGROUND;
	    if (this.index===THIS) this.color = COLOR_HIGHLIGHTED;
	    
	}
	update(){
	    //logging(THIS,"update 1");
	    if (typeof this.pos.x === 'undefined' || typeof this.pos.y === 'undefined') {
		throw new Error("x or y is undefined");
	    }
	    if (isNaN(this.pos.x) || isNaN(this.pos.y)) {
		throw new Error("x or y is NaN");
	    }	    
	    this.updateVelocity();
	    this.updatePosition();
	    this.updateEnergy();
	    this.updateAcceleration();
	    this.updateColor();
	    //logging(THIS,"update 2");
	}
	draw(){
            sketch.noStroke();
            sketch.fill(this.color);
            sketch.ellipse(this.pos.x, this.pos.y, this.radius * 2);
	    switch(mode) {
	    case 0: //無表記
		break;
	    case 1: //インデックス表記
		sketch.noFill();
		sketch.textSize(14);
		sketch.fill(25);
		sketch.textAlign(sketch.CENTER, sketch.CENTER);
		sketch.text(this.index,this.pos.x,this.pos.y);
		break;
	    case 2:// エネルギー表記
		sketch.noFill();
		sketch.textSize(14);
		sketch.fill(25);
		sketch.textAlign(sketch.CENTER, sketch.CENTER);
		sketch.text(Math.floor(this.energy*this.flag),this.pos.x,this.pos.y);
		break;
	    default:
		console.log("EEORR @ draw, modeが指定の範囲外です");
	    }
	}
	drawArrow(){
	    push(); // 新しい描画設定
	    // 矢印の基点を設定し、矢印を描く
	    line(this.pos.x+c.R, this.pos.y,     this.pos.x+c.R + this.vel.vx, this.pos.y); // X軸
	    line(this.pos.x,     this.pos.y+c.R, this.pos.x     + this.pos.y+c.R + this.vel.vy); // Y軸
	    //	    drawArrowHead(baseX + lenX, baseY + lenY, atan2(lenY, lenX)); // 矢印の頭を描く
	    line(this.pos.x, this.pos.y, baseX + lenX, baseY + lenY); // 矢印の本体	    
	    pop(); // 描画設定をリセット	    
	}
	/*
	drawArrowHead(x, y, angle) {
	    push(); // 新しい描画設定
	    translate(x, y); // 矢印の頭の位置に移動
	    rotate(angle); // 矢印の頭の角度調整
	    let arrowSize = 7; // 矢印の頭の大きさ
	    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
	    pop(); // 描画設定をリセット
	}
*/
	
 
    }
    class Quark {
	constructor(x, y, type) {
	    
            this.pos = {x:x,y:y};
            this.vel = {vx:0,vy:0};
	    this.acc = {ax:0,ay:0};
	    this.mass = 0;
            this.type = type;
            this.color = type === 'mu' ? COLOR_mu : COLOR_qi;
	}
	
	// 素粒子の運動の更新
	update(field) {
            const x = Math.floor(this.x / c.D);
            const y = Math.floor(this.y / c.D);
            const u = (this.x - x * c.D) / c.D;
            const v = (this.y - y * c.D) / c.D;
            const f1 = field[x][y];
            const f2 = field[x + 1][y];
            const f3 = field[x][y + 1];
            const f4 = field[x + 1][y + 1];
            const fx = (1 - u) * (1 - v) * f1.x + u * (1 - v) * f2.x + (1 - u) * v * f3.x + u * v * f4.x;
            const fy = (1 - u) * (1 - v) * f1.y + u * (1 - v) * f2.y + (1 - u) * v * f3.y + u * v * f4.y;
            this.vx = fx * c.gamma;
            this.vy = fy * c.gamma;
	    
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > c.c) {
		this.vx *= c.c / speed;
		this.vy *= c.c / speed;
            }
	    
            this.x += this.vx;
            this.y += this.vy;
	    
            // 周期境界条件の適用
            if (this.x < 0) this.x += c.L;
            if (this.x > c.L) this.x -= c.L;
            if (this.y < 0) this.y += c.L;
            if (this.y > c.L) this.y -= c.L;
	}
	draw() {
            if (c.DRAW_q) {
		sketch.stroke(this.color);
		sketch.fill(this.color);
		sketch.ellipse(this.x, this.y, 4);
            }
	}
    }
    
    //
    // 二つの粒子座標を与えたときに
    // 周期境界条件配下での最短距離を返す
    //
    function getMinimumDistance(x1, y1, x2, y2) {
	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const dx_min = Math.min(dx, c.L - dx);
	const dy_min = Math.min(dy, c.L - dy);
	//if (debflag) console.log("dx,dy,mx,my,d",dx,dy,dx_min,dy_min,Math.sqrt(dx_min * dx_min + dy_min * dy_min));	
	return Math.sqrt(dx_min * dx_min + dy_min * dy_min);

    }

    //
    // matrixには-1か距離が入る
    //　距離が入っている場合には、近傍にあるということを意味している
    //
    function updateNeighbourMatrix() {
	const N = particles.length;
	matrix = Array(N).fill().map(() => Array(N).fill(-1));
	
	for (let i = 0; i < N; i++) {
	    for (let j = i + 1; j < N; j++) {
		const distance = getMinimumDistance(
		    particles[i].pos.x,
		    particles[i].pos.y,
		    particles[j].pos.x,
		    particles[j].pos.y,
		    c.L
		);
		//console.log("distance[",i,"][",j,"]=",distance);
		//particles[i].logging(3,"updateNeighbourMatrix");
		if (distance < (particles[i].flag * particles[j].flag === 1 ? c.Rr : c.Ra)) {
		    //console.log("true");
		    matrix[i][j] = distance;
		    matrix[j][i] = distance;
		    //console.log(matrix);
		}
		else {
//		    console.log("false");
//		    console.log(particles[i].flag);
//		    console.log(particles[j].flag);		
//		    console.log("flag*flag=",particles[i].flag*particles[j].flag);
//		    let b = particles[i].flag * particles[j].flag === 1 ? true : false;
//		    let d=particles[i].flag * particles[j].flag === 1 ? c.Rr : c.Ra;
//		    console.log("d=",d,"b=",b);
		}
		
	    }
	}
	//console.log(matrix);
    }
	
    //
    // 斥力・引力
    //
    function rForce(r){
	return c.ro1/(r*r);
    }
    function aForce(r){
	return 1.0/(r*r*r*r);
    }
    function calcForce(i,j,f){
        let force = { x: 0, y: 0 };	
	
	const dx = particles[j].pos.x - particles[i].pos.x;
	const dy = particles[j].pos.y - particles[i].pos.y;
	force.x += dx/matrix[i][j] * f(matrix[i][j]) * particles[i].charge*particles[j].charge;
	force.y += dy/matrix[i][j] * f(matrix[i][j]) * particles[i].charge*particles[j].charge;
	
	return force;
    }
    function updateForces(){
	for(let i = 0 ; i < particles.length ; i++) {
	    particles[i].force.x=0;
	    particles[i].force.y=0;	    
	}
	for(let i = 0 ; i < particles.length ; i++) {
	    for(let j=i+1 ; j < particles.length ; j++) {
		if (matrix[i][j] !== -1) {
		    //console.log("matrix[",i,"][",j,"]=",matrix[i][j]);
		    /*
		    const aforce = calcForce(i,j,aForce);
		    const rforce = calcForce(i,j,rForce);		    
		    particles[i].force.x = aforce.x + rforce.x -c.f * particles[i].vel.vx;
		    particles[i].force.y = aforce.y + rforce.y -c.f * particles[i].vel.vy;
		    particles[j].force.x = aforce.x + rforce.x -c.f * particles[j].vel.vx;
		    particles[j].force.y = aforce.y + rforce.y -c.f * particles[j].vel.vy;
                    */
		    const rforce = calcForce(i,j,rForce);
		    particles[i].force.x +=  1.0*rforce.x;
		    particles[i].force.y +=  1.0+rforce.y;
		    particles[j].force.x += -1.0*rforce.x;
		    particles[j].force.y += -1.0*rforce.y;

		}
	    }
	}
	for(let i = 0 ; i < particles.length ; i++) {
	    particles[i].force.x -=  (c.f *particles[i].vel.vx);
	    particles[i].force.y -=  (c.f *particles[i].vel.vy-c.g);
	}
    }

    //
    // 粒子の生成
    //  エネルギー密度が高まったとき粒子が生成されるロジック
    //　素粒子分布によって初速度のx,y要素が決まる
    //
    /*
    function createParticle(x, y) {
	const r = c.R * 1.5;
	const numMu = quarks.filter(q => q.type === 'mu' && sketch.dist(q.x, q.y, x, y) < r).length;
	const numQi = quarks.filter(q => q.type === 'qi' && sketch.dist(q.x, q.y, x, y) < r).length;
	console.log("createParticle");
	if (numMu > c.X) {
            const energy = numMu * c.e;
            const particle = new Particle(x, y, energy, 'P');
            const vel = calculateInitialVelocity(x, y, r, 'mu');
            particle.vx = vel.x * Math.sqrt(2 * energy / c.m);
            particle.vy = vel.y * Math.sqrt(2 * energy / c.m);
            particles.push(particle);
	} else if (numQi > c.X) {
            const energy = -numQi * c.e;
            const particle = new Particle(x, y, energy, 'N');
            const vel = calculateInitialVelocity(x, y, r, 'qi');
            particle.vx = vel.x * Math.sqrt(2 * -energy / c.m);
            particle.vy = vel.y * Math.sqrt(2 * -energy / c.m);
            particles.push(particle);
	}
    }
    */
    //
    // 生成された粒子の初速度を計算
    //
    /*
    function calculateInitialVelocity(x, y, r, type) {
	const n = 12;
	const angleStep = sketch.TWO_PI / n;
	let vx = 0;
	let vy = 0;
	
	for (let i = 0; i < n; i++) {
            const angle = i * angleStep;
            const dx = r * Math.cos(angle);
            const dy = r * Math.sin(angle);
            const count = quarks.filter(q => q.type === type && sketch.dist(q.x, q.y, x + dx, y + dy) < r).length;
            vx += count * Math.cos(angle);
            vy += count * Math.sin(angle);
	}
	
	const magnitude = Math.sqrt(vx * vx + vy * vy);
	return { x: vx / magnitude, y: vy / magnitude };
    }
    */

    function updateFixedColors(){
	BACKGROUND=255.0*Math.abs(Math.cos(stime*sketch.TWO_PI*0.002));
	//console.log("stime=",stime);
	//console.log("two_pi=",sketch.TWO_PI);
	//console.log("stime*Math.TWO_PI=",stime*sketch.TWO_PI*0.1,"background=",BACKGROUND);
	COLOR_POSITIVE=255.0*Math.sin(stime*sketch.TWO_PI*0.04);
	
    }
    
    // 初期化関数
    function initializeParticles(type, count) {
	for (let i = 0; i < count; i++) {
	    const x = Math.random()*c.L;
	    const y = Math.random()*c.L;
	    particles.push(new Particle(x, y, type));
	}
    }
    
    sketch.setup = () => {
	//console.log("start");
	sketch.createCanvas(c.L, c.L);
	sketch.blendMode(sketch.HARD_LIGHT);
	g=sketch.createGraphics(c.L,c.L);
	
	initializeParticles('P', c.Np0);
	initializeParticles('N', c.Nn0);
	//console.log("initialized");
	//initializeQuarks('mu', c.Nm);
	//initializeQuarks('qi', c.Nq);
	//particles[0].logging();
	//particles[1].logging();
    };
    let updateCount=0;
    const TERM=3000000;
    let maxUpdates = TERM;

    sketch.draw =() =>{
	
	if (updateCount > maxUpdates) sketch.noLoop();
	stime+=c.dt;
	g.background(BACKGROUND);
	
	updateNeighbourMatrix();   // 粒子間の位置関係を更新
	updateForces();            // 現時点の位置から各粒子にかかる力の更新
	updateFixedColors();
	for (const particle of particles) {
	    particle.update();     // 粒子の位置、速度、エネルギー、加速度の更新。色の更新。
	    particle.draw();       // 描画
	    sketch.strokeWeight(2);
	    sketch.fill(25);
	}
	
	//for (const quark of quarks) {
	//quark.draw();	    
	//}
	/*	
	// ベクトル場の更新と素粒子の運動
	const field = updateVecotorField();
	for (const quark of quarks) {
	quark.update(field);
	quark.display();
	}
	
	// 粒子の消滅判定
	if ((particle.type === 'P' && particle.energy < c.Emin) ||
	(particle.type === 'N' && particle.energy > -c.Emin)) {
	removeParticle(particle);
	}
	}
	
	// 粒子の生成
	if (Math.random() < 0.1) {
	const x = Math.random(c.L);
	const y = Math.random(c.L);
	createParticle(x, y);
	}
	*/
	//console.log("c:",updateCount,"t:",Math.floor(stime*10)/10);
	updateCount++;	
    };
    // キープレスイベントハンドラ
    sketch.keyPressed = () => {
	if (sketch.key === 'h'){
	    console.log("help: r: restart, d: draw, m: matrix a+num: show particle");
	}
	if (sketch.key === 's'){
	    sketch.noLoop();
	}

	// アニメーションをステップ再開	
        if (sketch.key === 's' || sketch.key === 'S') {
            sketch.loop();
        }

	// アニメーションをリスタート
	if (sketch.key === 't'){
	    console.log("t=",stime);
	    sketch.loop();
	    //console.log("maxupdates=",maxUpdates);
	}
	
	if (sketch.key === 'r' || sketch.key === 'R') {
	    maxUpdates+=TERM;
	    sketch.loop();
	    //console.log("maxupdates=",maxUpdates);
	}
	
	if (sketch.key === 'd' || sketch.key === 'D') {
	    mode = mode > maxmode ? 0 : mode+1;
	    console.log("mode=",mode);
	    sketch.loop();
	}
	if (sketch.key === 'm'){
	    console.log("matrix is ",matrix);
	    debflag=true;	    
	    let sqrts=[];
	    for(let i = 0; i<particles.length; i++) {
		let rows=[];		
		for(let j=0; j<particles.length; j++){
		    let dx2 =(particles[i].pos.x-particles[j].pos.x)*(particles[i].pos.x-particles[j].pos.x);
		    let dy2 =(particles[i].pos.y-particles[j].pos.y)*(particles[i].pos.y-particles[j].pos.y);
		    rows.push(Math.sqrt(dx2+dy2));

		    getMinimumDistance(
			particles[i].pos.x,
			particles[i].pos.y,
			particles[j].pos.x,
			particles[j].pos.y,
			c.L
		    );
		    
		}
		sqrts.push("calc is ",rows);
		
	    }
	    console.log(sqrts);
	    debflag=false;
	    
		
	    
	}	
	if (sketch.key === 'a' || sketch.key === 'A') {
	    isAwaitingInput = true;  // 'a'が押されたので次の数字入力を待つ
	} else if (isAwaitingInput) {
	    if (sketch.key >= '0' && sketch.key <= '9') {
		let particleIndex = parseInt(sketch.key);  // 数字キーが押された場合、解析モードを設定
		particles[particleIndex].logging();
		
	    }
	    isAwaitingInput = false;  // 数字入力を終了	    
	}
	//event.preventDefault();
	//revent.stopPropagation();
    };
    
});


    

