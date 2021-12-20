'use strict'
const A4_WIDTH = 795.69;	// 210 mm
const A4_HEIGHT = 1124.52;	// 297 mm
const DRAWABLE_BORDER_HEIGHT = 8;

// Global variables
var activeFetchings = 0;
var allLines = Array();
var figureOptions = Array();
var selectedOptions = Array();
var btnDisplayOptions = undefined;
var elementSelectFigure = undefined;
var elementFigureOptions = undefined;
var elementCanvas = undefined;
var canvasContext = undefined;

// Functions
function onload()
{
	elementSelectFigure = document.getElementById('select-figure');
	elementFigureOptions = document.getElementById('figure-options');
	btnDisplayOptions = document.getElementById('btnDisplayOptions')

	elementCanvas = document.getElementById('canvas');
	elementCanvas.width = A4_WIDTH;
	elementCanvas.height = A4_HEIGHT;
	elementCanvas.classList.remove('hidden');

	canvasContext = elementCanvas.getContext('2d');

	fetchChildren(0, figureOptions);
}

function fetchChildren(parentID, children)
{
	IndexedDBOperation.do({
		operation: 'GetCompleteFigures',
		data: {
			parentID: parentID,
			children: children
		}
	}).then(returnData => {
		returnData.forEach(child => {
			let grandChildren = Array();

			let childID = parseInt(child.ID);
			let childName = child.name;
			let childData = {'name': childName, 'ID': childID, 'children': grandChildren};

			if(selectedOptions.length === 0 || (0 < selectedOptions.filter(option => {return option.ID === parentID}).length && children.length < 1))
			{
				selectedOptions.push(childData);
				fetchChildLines(childID);
			}

			fetchChildren(childID, grandChildren);

			children.push(childData);
		});
	});
}

function fetchChildLines(figureID)
{
	activeFetchings++;
	IndexedDBOperation.do({
		operation: 'GetFigureLines',
		data: {
			figureID: figureID
		}
	}).then(returnData => {
		checkActiveFetchings();
		if(0 < selectedOptions.filter(option => {return option.ID === figureID}).length)
		{
			returnData.forEach(lineData => {
				let pos_1 = new Position(lineData.x1, lineData.y1);
				let pos_2 = new Position(lineData.x2, lineData.y2);
				let line = new Line(pos_1, pos_2, new Color(lineData['Color']), lineData['Time']);

				line.figureID = figureID;
				allLines.push(line);
			});

			refreshCanvas();
		}
	}).catch(error => {
		checkActiveFetchings();
	});
}

function checkActiveFetchings()
{
	activeFetchings--;
	if(activeFetchings === 0)
	{
		btnDisplayOptions.disabled = false;
	}
}

function drawLines(allLines)
{
	canvasContext.lineWidth = 1;

	allLines.forEach((line, index) => {
		canvasContext.beginPath();
		canvasContext.moveTo(line.pos_1.X, line.pos_1.Y);
		canvasContext.lineTo(line.pos_2.X, line.pos_2.Y);
		canvasContext.strokeStyle = line.color.toString();
		canvasContext.stroke();
		canvasContext.closePath();
	});
}

function refreshCanvas()
{
	canvasContext.clearRect(0, 0, elementCanvas.width, elementCanvas.height);

	if(document.getElementById('cbxDisplayBorders').checked)
	{
		let borderOffset = DRAWABLE_BORDER_HEIGHT/2;
		canvasContext.lineWidth = DRAWABLE_BORDER_HEIGHT;

		let subFigures = groupBy(allLines, 'figureID');

		let rowsWithValue = -1;
		subFigures.forEach(lines => {
			if(lines){
				rowsWithValue++;
			}
		});

		subFigures.forEach((lines, figureID) => {
			if(rowsWithValue-- === 0){return;}
			let lowestLinePos = getLowestLinePos(lines);

			canvasContext.beginPath();
			canvasContext.moveTo(0, lowestLinePos - borderOffset);
			canvasContext.lineTo(elementCanvas.width, lowestLinePos - borderOffset);
			canvasContext.strokeStyle = '#AAA';
			canvasContext.stroke();
			canvasContext.closePath();
		});
	}

	drawLines(allLines);

	if(document.getElementById('cbxDisplayAuthors').checked)
	{
		let borderOffset = DRAWABLE_BORDER_HEIGHT/2;

		let subFigures = groupBy(allLines, 'figureID');

		subFigures.forEach((lines, figureID) => {
			let highestLinePos = getHighestLinePos(lines);
			let lowestLinePos = getLowestLinePos(lines);
			let figureData = selectedOptions.filter(option => {return option.ID === figureID});
			let figureName = 0 < figureData.length ? figureData[0].name : '';

			let fontSizePixel = 16;
			drawText(figureName, fontSizePixel, 'px Arial', elementCanvas.width - 10, highestLinePos + (lowestLinePos - highestLinePos)/2);
		});
	}
}

/** Source (modified): https://stackoverflow.com/questions/14446511/what-is-the-most-efficient-method-to-groupby-on-a-javascript-array-of-objects#comment64856953_34890276 */
function groupBy(list, key)
{
	let grouped = list.reduce(function(innerList, innerKey)
	{
		let value = key instanceof Function ? key(x) : innerKey[key];
		let element = innerList.find((item) => item && item.key === value);

		if(element)
		{
			element.values.push(innerKey);
		}
		else
		{
			innerList.push({key: value, values: [innerKey] });
		}

		return innerList;
	}, []);

	let returnArray = Array();
	grouped.forEach(item => {
		returnArray[item.key] = item.values;
	});

	return returnArray;
}

/** Source (modified): https://stackoverflow.com/a/18901408 */
function drawText(text, fontSize, font, x, y)
{
	canvasContext.save();
	canvasContext.font = fontSize + font;
	canvasContext.textBaseline = 'middle';
	canvasContext.textAlign = 'right';
	canvasContext.fillStyle = '#fff';

	var width = canvasContext.measureText(text).width;
	canvasContext.fillRect(x + 1, y - 1 - fontSize/2, -width -2, fontSize + 2);

	canvasContext.fillStyle = '#000';
	canvasContext.fillText(text, x, y);

	canvasContext.restore();
}

function getHighestLinePos(lines=Array())
{
	let linePos = undefined;
	if(0 < lines.length)
	{
		let positions = Array();
		lines.forEach(line => {
			positions.push(line.pos_1.Y);
			positions.push(line.pos_2.Y);
		});
		linePos = positions.sort((a, b) => {return a - b;})[0];
	}
	return linePos;
}

function getLowestLinePos(lines=Array())
{
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

function displayOptions()
{
	updateOptions();
	elementSelectFigure.classList.toggle('hidden');
}

function updateFigure()
{
	btnDisplayOptions.disabled = true;
	allLines = Array();
	refreshCanvas();

	elementSelectFigure.classList.add('hidden');
	selectedOptions.forEach(option => {
		fetchChildLines(option.ID);
	});
}

/** Source (modified): https://stackoverflow.com/a/17061022 */
function printOut()
{
	let names = '';
	selectedOptions.forEach(option => {
		if(names !== '')
		{
			names += ', ';
		}
		names += option.name;
	});

	var dataUrl = elementCanvas.toDataURL();
	var windowContent = '<!DOCTYPE html><html><head>';
	windowContent += '<title>Funny figure ('+names+')</title></head>';
	windowContent += '<body><img src="'+dataUrl+'"></body></html>';

	var printWindow = window.open('','','width=800,height=600');
	printWindow.document.open();
	printWindow.document.write(windowContent);
	printWindow.document.close();
	printWindow.focus();
	window.requestAnimationFrame(function(){
		printWindow.print();
		printWindow.close();
	});
}

function updateOptions(options=figureOptions, partIndex=0)
{
	if(0 < options.length)
	{
		let elementSelect = document.getElementById('figures_' + partIndex);
		if(elementSelect !== null)
		{
			elementFigureOptions.removeChild(elementSelect);
		}

		elementSelect = document.createElement('select');
		elementFigureOptions.appendChild(elementSelect);
		elementSelect.id = 'figures_' + partIndex;
		elementSelect.addEventListener('change', function()
		{
			let inner_figureOption = JSON.parse(this.selectedOptions[0].dataset.figureOption);
			selectedOptions[partIndex] = inner_figureOption;
			updateOptions(inner_figureOption.children, partIndex + 1);
		});

		let selectedOption = null;
		options.forEach((figureOption, index) => {
			let elementOption = document.createElement('option');
			elementSelect.appendChild(elementOption);
			elementOption.value = figureOption.ID;
			elementOption.innerHTML = figureOption.name;
			elementOption.selected = 0 < selectedOptions.filter(option => {return option.ID === figureOption.ID}).length;
			elementOption.dataset.figureOption = JSON.stringify(figureOption);

			if(elementOption.selected)
			{
				selectedOption = figureOption;
			}
		});

		if(selectedOption === null)
		{
			selectedOptions[partIndex] = options[0];
		}
		else
		{
			selectedOptions[partIndex] = selectedOption;
		}

		if(partIndex < selectedOptions.length)
		{
			updateOptions(selectedOptions[partIndex].children, partIndex + 1);
		}
	}
}