'use strict'
const A4_WIDTH = 795.69;	// 210 mm
const A4_HEIGHT = 1124.52;	// 297 mm
const COLOR_BORDER_UPPER = new Color('AAA');
const COLOR_BORDER_LOWER = new Color('BBB');
const COLOR_BORDER_GUIDE = new Color('CCC');
const COLOR_LINE_HINT = new Color(0, 0, 0, 127);
const DRAWABLE_BORDER_HEIGHT = 8;
const ERASER_SIZE = 8;

// Global variables
var btnPublish = undefined;
var btnGetUnfinished = undefined;
var elementCanvas = undefined;
var elementLineColor = undefined;
var elementCanvasConsole = undefined;

var bodyPart = 1;
var offset_X = 0;
var offset_Y = -32
var lines = Array();
var derivedFrom = null;
var showLineHints = false;
var frameWidth = undefined;
var frameHeight = undefined;
var inputMode_pen = true;
var canvasContext = undefined;
var elementSplash = undefined;
var elementOffsetX = undefined;
var elementOffsetY = undefined;
var elementOffsetDisplayer = undefined;
var previousLines = Array();
var previousLinePos = undefined;
var previousLowestPos = undefined;
var previousOffsetPos = undefined;
var canvasBoundingClientRect = undefined;
let elementPublishInformation;
let elementPublishInformationAbort;
let elementPublishInformationPublish;
let elementPublishInformationAuthor;
let elementPublishInformationFigureName;
let isLastPart;

// Functions
function onload(){
	// Init element variables
	btnPublish = document.getElementById('btnPublish');
	btnGetUnfinished = document.getElementById('btnGetUnfinished');
	elementSplash = document.getElementById('splash');
	elementCanvas = document.getElementById('canvas');
	elementCanvasConsole = document.getElementById('canvas-console');
	elementLineColor = document.getElementById('line-color');
	elementOffsetDisplayer = document.getElementById('offset-displayer');
	elementOffsetX = document.getElementById('offset-x');
	elementOffsetY = document.getElementById('offset-y');
	elementPublishInformation = document.getElementById('publish-information-wrapper');
	elementPublishInformationAbort = document.getElementById('publish-information-abort');;
	elementPublishInformationPublish = document.getElementById('publish-information-publish');;
	elementPublishInformationAuthor = document.getElementById('publish-information-author');;
	elementPublishInformationFigureName = document.getElementById('publish-information-name');;

	// Call init functions
	chechUnfinishedFigures();

	// Init variables
	elementCanvas.classList.remove('hidden');
	window.onresize = resize;
	window.onresize();

	offset_X = Math.floor(-(frameWidth - A4_WIDTH)/2);

	document.onkeydown = keyPressed;
	btnPublish.addEventListener('mouseover', function(){drawUpperBorder(getLowestLinePos(lines)); drawBorderHint();});
	btnPublish.addEventListener('mouseout', function(){updateCanvas();});
	elementPublishInformationAbort.addEventListener('click', ()=>elementPublishInformation.classList.add('hidden'));
	elementPublishInformationPublish.addEventListener('click', publish);
	elementCanvas.addEventListener('mousedown', mouseDown, false);
	elementCanvas.addEventListener('mouseup', mouseUp, false);
	elementCanvas.addEventListener('touchstart', mouseDown, false);
	elementCanvas.addEventListener('touchcancel', mouseUp, false);
	elementCanvas.addEventListener('contextmenu', function(event){event.preventDefault(); return false;}, false);

	canvasContext = elementCanvas.getContext('2d');
}
function getEventPos(event){
	let x = 0;
	let y = 0;
	if(event.touches === undefined)
	{
		x = event.clientX;
		y = event.clientY;
	}
	else
	{
		let length = event.touches.length;
		for(let index = 0; index < length; index++)
		{
			let touch = event.touches[index];
			x += touch.clientX;
			y += touch.clientY;
		}

		x /= length;
		y /= length;
	}

	return new Position(x, y);
}
function mouseDown(event){
	let eventPos = getEventPos(event);

	eventPos.X -= canvasBoundingClientRect.left;
	eventPos.Y -= canvasBoundingClientRect.top;

	event.preventDefault();

	if(event.touches !== undefined)
	{
		if(1 < event.touches.length)
		{
			previousOffsetPos = eventPos;
			elementCanvas.style.cursor = 'move';
			elementCanvas.removeEventListener('touchmove', doLine);
			elementCanvas.addEventListener('touchmove', doOffset, false);
			elementOffsetDisplayerstyle.display = 'initial';
		}
		else
		{
			eventPos.X += offset_X;
			eventPos.Y += offset_Y;
			previousLinePos = eventPos;
			elementCanvas.removeEventListener('touchmove', doOffset);
			elementCanvas.addEventListener('touchmove', doLine, false);
		}
	}
	else if(event.button === 0)
	{
		eventPos.X += offset_X;
		eventPos.Y += offset_Y;
		previousLinePos = eventPos;
		elementCanvas.addEventListener('mousemove', doLine, false);
	}
	else if(event.button === 2)
	{
		previousOffsetPos = eventPos;
		elementCanvas.style.cursor = 'move';
		elementCanvas.addEventListener('mousemove', doOffset, false);
		elementOffsetDisplayer.style.display = 'initial';
	}
	
	return false;
}
function doLine(innerEvent){
	if(inputMode_pen)
	{
		let eventPos = getEventPos(innerEvent);

		eventPos.X += offset_X - canvasBoundingClientRect.left;
		eventPos.Y += offset_Y - canvasBoundingClientRect.top;

		continueLine(eventPos);

		window.requestAnimationFrame(updateCanvas);
	}
}
function doOffset(innerEvent){
	let eventPos = getEventPos(innerEvent);

	eventPos.X -= canvasBoundingClientRect.left;
	eventPos.Y -= canvasBoundingClientRect.top;

	offset_X += previousOffsetPos.X - eventPos.X;
	offset_Y += previousOffsetPos.Y - eventPos.Y;

	previousOffsetPos = eventPos;

	window.requestAnimationFrame(updateCanvas);
}
function mouseUp(event){
	event.preventDefault();

	if(event.touches !== undefined)
	{
		elementCanvas.removeEventListener('touchmove', doLine);
		elementCanvas.removeEventListener('touchmove', doOffset);
		previousLinePos = undefined;
	}
	else if(event.button === 0)
	{
		elementCanvas.removeEventListener('mousemove', doLine);
		previousLinePos = undefined;
	}
	else if(event.button === 2)
	{
		elementCanvas.removeEventListener('mousemove', doOffset);
		elementCanvas.style.cursor = '';
		previousOffsetPos = undefined;
		elementOffsetDisplayer.style.display = '';
	}
	
	return false;
}
function keyPressed(event){
	event = window.event ? window.event : event;

	if(!event.repeat && event.ctrlKey)
	{
		switch(event.code)
		{
			case 'KeyZ':
				undoLine();
				break;
		
			case 'KeyY':
				redoLine();
				break;
		}
	}
}
function resize(){
	frameWidth = window.innerWidth;
	frameHeight = window.innerHeight;
	elementCanvas.width = frameWidth;
	elementCanvas.height = frameHeight;
	canvasBoundingClientRect = elementCanvas.getBoundingClientRect();
	window.requestAnimationFrame(updateCanvas);
}
function updateCanvas(timespan){
	canvasContext.clearRect(0, 0, frameWidth, frameHeight);

	drawPaper();
	drawLowerBorder();
	drawUpperBorderLine(previousLowestPos);
	drawLines(previousLines);
	drawUpperBorder(previousLowestPos);
	drawLines(lines);

	if(showLineHints)
	{
		drawLineHints(previousLowestPos);
	}

	if(previousOffsetPos !== undefined)
	{
		elementOffsetX.innerHTML = offset_X;
		elementOffsetY.innerHTML = -offset_Y;
	}
}
function showLineMarkers(state){
	showLineHints = state;
	updateCanvas();
}
function drawLineHints(borderPos){
	let borderPosUpper = borderPos - DRAWABLE_BORDER_HEIGHT;
	let linesWitinBorder = previousLines.filter(line => {return (borderPos > line.pos_1.Y && line.pos_1.Y > borderPosUpper)
															||	(borderPos > line.pos_2.Y && line.pos_2.Y > borderPosUpper);});
	linesWitinBorder.forEach(line => {
		canvasContext.strokeStyle = COLOR_LINE_HINT.toRGBAString();
		canvasContext.beginPath();
		canvasContext.arc(line.pos_1.X - offset_X, line.pos_1.Y - offset_Y, ERASER_SIZE, 0, 2*Math.PI);
		canvasContext.stroke();
		canvasContext.beginPath();
		canvasContext.arc(line.pos_2.X - offset_X, line.pos_2.Y - offset_Y, ERASER_SIZE, 0, 2*Math.PI);
		canvasContext.stroke();
	});
}
function changeInputMode(elementSelect){
	let options = elementSelect.selectedOptions;
	if(0 < options.length)
	{
		inputMode_pen = true;
		elementCanvas.style.cursor = '';
		elementCanvas.removeEventListener('mousemove', traceEraser);
		elementCanvas.removeEventListener('mousedown', traceEraser);
		elementCanvas.removeEventListener('touchmove', traceEraser);
		elementCanvas.removeEventListener('touchstart', traceEraser);

		switch(options[0].value)
		{
			case 'ERASER':
				inputMode_pen = false;
				elementCanvas.style.cursor = 'url("data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="), auto';
				elementCanvas.addEventListener('mousemove', traceEraser, false);
				elementCanvas.addEventListener('mousedown', traceEraser, false);
				elementCanvas.addEventListener('touchmove', traceEraser, false);
				elementCanvas.addEventListener('touchstart', traceEraser, false);
				break;
		}
	}
}
function traceEraser(event){
	let eventPos = getEventPos(event);
	eventPos.X -= canvasBoundingClientRect.left;
	eventPos.Y -= canvasBoundingClientRect.top;

	let eraserPos = new Position(eventPos.X + offset_X, eventPos.Y + offset_Y);

	if(0 < event.buttons)
	{
		lines.filter(line => {return line.visible && (eraserPos.getDistance(line.pos_1) < ERASER_SIZE || eraserPos.getDistance(line.pos_2) < ERASER_SIZE);}).forEach(line => {
			line.visible = false;
		});
	}

	updateCanvas();
	canvasContext.strokeStyle = '#000';
	canvasContext.beginPath();
	canvasContext.arc(eventPos.X, eventPos.Y, ERASER_SIZE, 0, 2*Math.PI);
	canvasContext.stroke();
}
function drawPaper(){
	canvasContext.fillStyle = '#fff';
	canvasContext.fillRect(-offset_X, -offset_Y, A4_WIDTH, A4_HEIGHT);
}
function drawUpperBorder(posY=0){
	if(0 < posY)
	{
		canvasContext.fillStyle = COLOR_BORDER_UPPER.toString();
		canvasContext.fillRect(-offset_X, -offset_Y, A4_WIDTH, posY - DRAWABLE_BORDER_HEIGHT);
	}
}
function drawUpperBorderLine(posY=0){
	if(0 < posY)
	{
		canvasContext.fillStyle = COLOR_BORDER_LOWER.toString();
		canvasContext.fillRect(-offset_X, -offset_Y + posY - DRAWABLE_BORDER_HEIGHT - 1, A4_WIDTH, DRAWABLE_BORDER_HEIGHT);
	}
}
function drawBorderHint(){
	let text = 'This is what next drawer will see →';
	let fontSize = '14';
	let font = 'px Arial';
	let x = -offset_X - 1;
	let y = getLowestLinePos(lines.filter(line => {return line.visible;}));

	if(y !== undefined)
	{
		y += -offset_Y - DRAWABLE_BORDER_HEIGHT/2 - 1;
		canvasContext.save();
		canvasContext.font = fontSize + font;
		canvasContext.textBaseline = 'middle';
		canvasContext.textAlign = 'right';
		canvasContext.fillStyle = '#000';
		canvasContext.fillText(text, x, y);
		canvasContext.restore();
	}
}
function drawLowerBorder(){
	let localLines = lines.filter(line => {return line.visible;});
	if(!isLastPart && 0 < localLines.length){
		let lowestLinePos = getLowestLinePos(localLines);
		canvasContext.fillStyle = COLOR_BORDER_LOWER.toString();
		canvasContext.fillRect(-offset_X, -offset_Y + lowestLinePos, A4_WIDTH, -DRAWABLE_BORDER_HEIGHT);
	}
}
function getLowestLinePos(lines=Array()){
	let linePos = undefined;
	if(0 < lines.length)
	{
		let positions = Array();
		lines.forEach(line => {
			positions.push(line.pos_1.Y);
			positions.push(line.pos_2.Y);
		});
		linePos = positions.sort((a, b) => {return b - a;})[0];
	}
	return linePos;
}
function continueLine(currentPos){
	let isPointLowEnough = previousLowestPos === undefined ? true : previousLowestPos - DRAWABLE_BORDER_HEIGHT < currentPos.Y;

	if(isPointLowEnough)
	{
		if(previousLinePos !== undefined)
		{
			addLine(previousLinePos, currentPos);
		}
		previousLinePos = currentPos;
	}
	else
	{
		previousLinePos = undefined;
	}
}
function undoLine(pos_1, pos_2){
	if(previousLinePos === undefined)
	{
		let line = lines.filter(line => {return line.visible;}).pop();
		if(line !== undefined)
		{
			line.visible = false;
			window.requestAnimationFrame(updateCanvas);
		}
	}
}
function redoLine(pos_1, pos_2){
	if(previousLinePos === undefined)
	{
		let line = lines.filter(line => {return !line.visible;}).shift();
		if(line !== undefined)
		{
			line.visible = true;
			window.requestAnimationFrame(updateCanvas);
		}
	}
}
let FIRST_LINE_DRAWN = undefined;
function addLine(pos_1, pos_2){
	let color = new Color(elementLineColor.value);

	let now = Date.now();
	if(FIRST_LINE_DRAWN === undefined)
	{
		FIRST_LINE_DRAWN = now;
	}
	let time = now - FIRST_LINE_DRAWN;

	let line = new Line(pos_1, pos_2, color, time);
	line.visible = true;
	lines.push(line);
}
function drawLines(lines){
	canvasContext.lineWidth = 1;
	lines.filter(line => {return line.visible;}).forEach((line, index) => {
		canvasContext.beginPath();
		canvasContext.moveTo(line.pos_1.X - offset_X, line.pos_1.Y - offset_Y);
		canvasContext.lineTo(line.pos_2.X - offset_X, line.pos_2.Y - offset_Y);
		canvasContext.strokeStyle = line.color.toString();
		canvasContext.stroke();
		canvasContext.closePath();
	});
}
function openPublish(){
	elementPublishInformation.classList.remove('hidden');
}
function publish(){
	btnPublish.disabled = true;
	displayMessage('Publishing');

	let stringifyLines = Array(); // Needed?
	lines.filter(line => line.visible).forEach(line => {
		let localLine = {
			time: line.layer,
			x1: line.pos_1.X,
			y1: line.pos_1.Y,
			x2: line.pos_2.X,
			y2: line.pos_2.Y,
			color: line.color.toString()
		};
		stringifyLines.push(localLine);
	});

	IndexedDBOperation.do({
		operation: 'StoreBodyPart',
		data: {
			type: 1, // TODO: Do not hardcode. Three segment
			lines: stringifyLines,
			bodyPart: bodyPart,
			derivedFrom: derivedFrom,
			name: elementPublishInformationFigureName.value,
			author: elementPublishInformationAuthor.value
		}
	}).then(response => {
		switch(response){
			case 'DONE':
				elementSplash.classList.add('hidden');
				displayMessage('Body part stored');
				location.reload();
				break;
			case 'NOT-PUBLISHED':
				btnPublish.disabled = false;
				displayMessage('Body part failed to store, try again later');
				break;
		}
	}).catch(()=>{
		console.error('publish', error);
		btnPublish.disabled = false;
		displayMessage('Body part failed to store, try again later');
	});
}
function displayMessage(message){
	elementSplash.innerHTML = message;
	elementSplash.classList.remove('hidden');
	elementSplash.classList.remove('fade-animate');
	window.requestAnimationFrame(function(){window.requestAnimationFrame(function(){elementSplash.classList.add('fade-animate');});});
}
function fetchUnfinished(){
	btnGetUnfinished.disabled = true;

	IndexedDBOperation.do	({
		operation: 'GetPartlyFigures',
		data: {
			type: 1 // TODO: Do not hardcode. Three segment
		}
	}).then(entry => {
		derivedFrom = entry.derivedFrom;
		fetchChildLines(entry);
		bodyPart = entry.bodyPartNext;
	}).catch(error => {
		console.error('fetchUnfinished', error);
		displayMessage('Could not load previous figures');
		btnGetUnfinished.disabled = false;
	});
}
function chechUnfinishedFigures(){
	IndexedDBOperation.do({
		operation: 'GetPartlyFigures',
		data: {
			type: 1 // TODO: Do not hardcode. Three segment
		}
	}).then(returnData => {
		if(returnData){
			btnGetUnfinished.disabled = false;
		}
	}).catch(error => {
		console.error('chechUnfinishedFigures', error);
		displayMessage('Could not validate previous figures');
		btnGetUnfinished.disabled = false;
	});
}
function fetchChildLines(entry){
	IndexedDBOperation.do({
		operation: 'IsLastPart',
		data: {
			type: 1, // TODO: Do not hardcode. Three segment
			bodyPart: entry.bodyPartNext
		}
	}).then(response => isLastPart = response).catch(()=>{
		console.error('IsLastPart', error);
	});

	IndexedDBOperation.do({
		operation: 'GetFigureLines',
		data: {
			figureID: entry.derivedFrom
		}
	}).then(returnData => {
		previousLines = Array();
		returnData.forEach(lineData => {
			let pos_1 = new Position(lineData['x1'], lineData['y1']);
			let pos_2 = new Position(lineData['x2'], lineData['y2']);
			let line = new Line(pos_1, pos_2, new Color(lineData['Color']), lineData['Time']);
			line.visible = true;
			previousLines.push(line);
		});
		previousLowestPos = getLowestLinePos(previousLines);
		btnPublish.value = 'Publishing ' + entry.bodyPartNextName;
		btnGetUnfinished.classList.add('hidden');
		let btnShowLineMarkers = document.getElementById('btnShowLineMarkers');
		btnShowLineMarkers.classList.remove('hidden');
		window.requestAnimationFrame(timespan => {
			showLineHints = true;
			updateCanvas(timespan);
			setInterval(()=>{
				showLineHints = false;
				updateCanvas(timespan);
				btnShowLineMarkers.disabled = false;
			}, 1500);
		});
	}).catch(error => {
		console.error('fetchChildLines', error);
		displayMessage('Could not get figure');
	});
}