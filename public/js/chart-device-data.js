
$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DevData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.temperatureData = new Array(this.maxLen);
      this.humidityData = new Array(this.maxLen);
    }

    addData(time, temperature, humidity) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
      }
    }
  }

  class Devices {
    constructor() {
      this.devices = [];
    }

    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const TracDev = new Devices();
  
/*Set the design of the graph*/
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Temp',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 102, 0, 1)',
        pointBoarderColor: 'rgba(255, 102, 0, 1)',
        backgroundColor: 'rgba(255, 102, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 102, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 102, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Humx',
        yAxisID: 'Humidity',
        borderColor: 'rgba(51, 204, 51, 1)',
        pointBoarderColor: 'rgba(51, 204, 51, 1)',
        backgroundColor: 'rgba(51, 204, 51, 0.4)',
        pointHoverBackgroundColor: 'rgba(51, 204, 51, 1)',
        pointHoverBorderColor: 'rgba(51, 204, 51, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'Humidity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Humidity (%)',
          display: true,
        },
        position: 'right',
      }]
    }
  };

  
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  let needsAutoSelect = true;
  const Count = document.getElementById('Count');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = TracDev.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      if (!messageData.MessageDate || (!messageData.IotData.temperature && !messageData.IotData.humidity)) {
        return;
      }

      const existingDevData = TracDev.findDevice(messageData.DeviceId);

      if (existingDevData) {
        existingDevData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);
      } else {
        const newDevData = new DevData(messageData.DeviceId);
        TracDev.devices.push(newDevData);
        const numDevices = TracDev.getDevicesCount();
        Count.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDevData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);

        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});