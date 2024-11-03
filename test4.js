const processes = [];
const timeQuantum = 2;

function updateDeleteSelect() {
  const select = document.getElementById('processToDelete');
  select.innerHTML = '<option value="">Select process to delete</option>' +
    processes.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
}

function deleteProcess() {
  const selectedId = document.getElementById('processToDelete').value;
  if (selectedId) {
    const index = processes.findIndex(p => p.id === selectedId);
    if (index !== -1) {
      processes.splice(index, 1);
      updateProcessTable();
      updateDeleteSelect();
    }
  }
}

function addProcess() {
  const processId = document.getElementById('processId').value;
  const arrivalTime = parseInt(document.getElementById('arrivalTime').value);
  const burstTime = parseInt(document.getElementById('burstTime').value);
  const priority = parseInt(document.getElementById('priority').value);

  if (processId && !isNaN(arrivalTime) && !isNaN(burstTime) && !isNaN(priority)) {
    processes.push({
      id: processId,
      arrivalTime,
      burstTime,
      priority
    });
    updateProcessTable();
    updateDeleteSelect();
    clearInputs();
  }
}

function clearInputs() {
  document.getElementById('processId').value = '';
  document.getElementById('arrivalTime').value = '';
  document.getElementById('burstTime').value = '';
  document.getElementById('priority').value = '';
}

function updateProcessTable() {
  const tbody = document.querySelector('#processTable tbody');
  tbody.innerHTML = processes.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.arrivalTime}</td>
      <td>${p.burstTime}</td>
      <td>${p.priority}</td>
    </tr>
  `).join('');
}

function generateSingleProcess() {
  const processNumber = processes.length + 1;
  processes.push({
    id: `P${processNumber}`,
    arrivalTime: Math.floor(Math.random() * 10),
    burstTime: Math.floor(Math.random() * 10) + 1,
    priority: Math.floor(Math.random() * 5) + 1
  });
  updateProcessTable();
  updateDeleteSelect();
}

function reset() {
  processes.length = 0;
  updateProcessTable();
  updateDeleteSelect();
  document.querySelector('#resultsTable tbody').innerHTML = '';
  document.getElementById('averageTimes').innerHTML = '';
}

// Call runSimulation to test the function after ensuring processes are properly added
function runSimulation() {
  if (processes.length === 0) return;

  const fcfsResults = FCFS([...processes]);
  const rrResults = RR(processes.map(p => ({ ...p }))); // Deep copy for RR

  displayResults(fcfsResults, rrResults);
}

// FCFS Scheduling 
function FCFS(processList) {
  const processes = [...processList].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const timeline = [];
  let currentTime = 0;

  processes.forEach(process => {
    // Skip idle time if needed
    if (currentTime < process.arrivalTime) {
      currentTime = process.arrivalTime;
    }

    // Add process execution to timeline
    timeline.push({
      processId: process.id,
      startTime: currentTime,
      duration: process.burstTime,
      endTime: currentTime + process.burstTime
    });

    currentTime += process.burstTime;

    // Calculate times for this process
    process.completionTime = currentTime;
    process.turnaroundTime = process.completionTime - process.arrivalTime;
    process.waitingTime = process.turnaroundTime - process.burstTime;
  });

  // Calculate averages
  const avgWaitingTime = processes.reduce((sum, p) => sum + p.waitingTime, 0) / processes.length;
  const avgTurnaroundTime = processes.reduce((sum, p) => sum + p.turnaroundTime, 0) / processes.length;

  return {
    results: processes,
    timeline: timeline,
    averages: {
      waiting: avgWaitingTime,
      turnaround: avgTurnaroundTime
    }
  };
}

// RR Scheduling 
function RR(processList) {
  const processes = processList.map(p => ({
    ...p,
    remainingTime: p.burstTime
  })).sort((a, b) => a.arrivalTime - b.arrivalTime);

  const timeline = [];
  const completed = [];
  let currentTime = 0;
  let readyQueue = [];

  while (processes.some(p => p.remainingTime > 0)) {
    // Add newly arrived processes to ready queue
    const newArrivals = processes.filter(p => 
      p.arrivalTime <= currentTime && 
      p.remainingTime > 0 && 
      !readyQueue.includes(p)
    );
    readyQueue.push(...newArrivals);

    if (readyQueue.length === 0) {
      // No process ready, advance time to next arrival
      const nextArrival = processes.find(p => 
        p.arrivalTime > currentTime && 
        p.remainingTime > 0
      );
      if (nextArrival) {
        currentTime = nextArrival.arrivalTime;
        continue;
      }
      break;
    }

    // Get next process from queue
    const currentProcess = readyQueue.shift();
    const quantum = Math.min(timeQuantum, currentProcess.remainingTime);

    // Add to timeline
    timeline.push({
      processId: currentProcess.id,
      startTime: currentTime,
      duration: quantum,
      endTime: currentTime + quantum
    });

    currentTime += quantum;
    currentProcess.remainingTime -= quantum;

    // Check if process is complete
    if (currentProcess.remainingTime <= 0) {
      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
      completed.push(currentProcess);
    } else {
      // Process still needs more time, add back to queue
      readyQueue.push(currentProcess);
    }
  }

  // Calculate averages
  const avgWaitingTime = completed.reduce((sum, p) => sum + p.waitingTime, 0) / completed.length;
  const avgTurnaroundTime = completed.reduce((sum, p) => sum + p.turnaroundTime, 0) / completed.length;

  return {
    results: completed.sort((a, b) => a.id.localeCompare(b.id)),
    timeline: timeline,
    averages: {
      waiting: avgWaitingTime,
      turnaround: avgTurnaroundTime
    }
  };
}

function displayResults(fcfsResults, rrResults) {
  function getRandomColor() {
  const r = Math.floor(Math.random() * 128); 
  const g = Math.floor(Math.random() * 128); 
  const b = Math.floor(Math.random() * 128); 
  return `rgb(${r}, ${g}, ${b})`;
  } 

  function createGanttChart(timeline, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = timeline.map(block => `
      <div class="gantt-block" style="background-color: ${getRandomColor(block.processId)};">
        <div class="gantt-time">${block.duration}</div>
        <div class="gantt-process">${block.processId}</div>
      </div>
    `).join('');
  }

  function displayResultTable(results, tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = results.results.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.arrivalTime}</td>
        <td>${r.burstTime}</td>
        <td>${r.priority}</td>
        <td>${r.completionTime}</td>
        <td>${r.waitingTime}</td>
        <td>${r.turnaroundTime}</td>
      </tr>
    `).join('');
  }

  function displayAverages(averages, elementId) {
    document.getElementById(elementId).innerHTML = `
      Average Waiting Time: ${averages.waiting.toFixed(2)}<br>
      Average Turnaround Time: ${averages.turnaround.toFixed(2)}
    `;
  }

  // Display FCFS results
  createGanttChart(fcfsResults.timeline, 'fcfsGantt');
  displayResultTable(fcfsResults, 'fcfsResultsTable');
  displayAverages(fcfsResults.averages, 'fcfsAverageTimes');

  // Display RR results
  createGanttChart(rrResults.timeline, 'rrGantt');
  displayResultTable(rrResults, 'rrResultsTable');
  displayAverages(rrResults.averages, 'rrAverageTimes');
}
