let libraryData = [];
let viewer = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initViewer();
    setupEventListeners();
});

// Load JSON data
async function loadData() {
    try {
        const response = await fetch('library.json');
        libraryData = await response.json();
        
        populateFilters();
        renderTable(libraryData);
    } catch (error) {
        console.error("Error loading library data:", error);
        document.getElementById('tableBody').innerHTML = `
            <tr><td colspan="5" class="center">Error loading data. Make sure you are running a local server.</td></tr>
        `;
    }
}

// Populate dropdown filters based on unique values
function populateFilters() {
    const organisms = new Set();
    const antigens = new Set();
    
    libraryData.forEach(item => {
        if (item.organism) organisms.add(item.organism);
        if (item.antigen) antigens.add(item.antigen);
    });
    
    const orgSelect = document.getElementById('organismFilter');
    Array.from(organisms).sort().forEach(org => {
        const option = document.createElement('option');
        option.value = org;
        option.textContent = org;
        orgSelect.appendChild(option);
    });
    
    const agSelect = document.getElementById('antigenFilter');
    Array.from(antigens).sort().forEach(ag => {
        const option = document.createElement('option');
        option.value = ag;
        option.textContent = ag;
        agSelect.appendChild(option);
    });
}

// Render the table
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    document.getElementById('resultCount').textContent = data.length;
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="center" style="color: var(--text-secondary)">No nanobodies found matching your criteria.</td></tr>`;
        return;
    }
    
    // Create fragment for better performance
    const fragment = document.createDocumentFragment();
    
    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.dataset.index = index; // Store index to retrieve data later
        tr.dataset.pdb = item.pdb;
        
        // If there is a paper link, illuminate the icon. Otherwise, keep it disabled.
        const paperLinkHtml = item.paper_link 
            ? `<a href="${item.paper_link}" target="_blank" class="paper-link illuminated" title="View Paper"><i class="ph ph-file-text"></i></a>`
            : `<span class="paper-link disabled"><i class="ph ph-file-dashed"></i></span>`;
            
        tr.innerHTML = `
            <td><a href="https://www.rcsb.org/structure/${item.pdb}" target="_blank" class="badge-pdb" onclick="event.stopPropagation()">${item.pdb}</a></td>
            <td>${item.antigen || '-'}</td>
            <td>${item.organism || '-'}</td>
            <td>${item.method || '-'}</td>
            <td class="center" onclick="event.stopPropagation()">${paperLinkHtml}</td>
        `;
        
        tr.addEventListener('click', () => selectRow(tr, item));
        fragment.appendChild(tr);
    });
    
    tbody.appendChild(fragment);
}

// Setup Event Listeners for Search and Filter
function setupEventListeners() {
    const searchInput = document.getElementById('globalSearch');
    const orgFilter = document.getElementById('organismFilter');
    const agFilter = document.getElementById('antigenFilter');
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedOrg = orgFilter.value;
        const selectedAg = agFilter.value;
        
        const filtered = libraryData.filter(item => {
            // Search text
            const textMatch = !searchTerm || 
                (item.pdb && item.pdb.toLowerCase().includes(searchTerm)) ||
                (item.antigen && item.antigen.toLowerCase().includes(searchTerm)) ||
                (item.organism && item.organism.toLowerCase().includes(searchTerm)) ||
                (item.method && item.method.toLowerCase().includes(searchTerm));
                
            // Dropdown filters
            const orgMatch = !selectedOrg || item.organism === selectedOrg;
            const agMatch = !selectedAg || item.antigen === selectedAg;
            
            return textMatch && orgMatch && agMatch;
        });
        
        renderTable(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
    orgFilter.addEventListener('change', applyFilters);
    agFilter.addEventListener('change', applyFilters);
}

// Initialize PDBe Molstar viewer
function initViewer() {
    viewer = new PDBeMolstarPlugin();
}

// Handle row selection
function selectRow(trElement, item) {
    // Remove active class from all rows
    document.querySelectorAll('#tableBody tr').forEach(tr => tr.classList.remove('active'));
    
    // Add active class to clicked row
    trElement.classList.add('active');
    
    // Update Viewer Header
    const badge = document.getElementById('activePdbLabel');
    badge.innerHTML = `PDB: <a href="https://www.rcsb.org/structure/${item.pdb}" target="_blank" style="color: inherit; text-decoration: underline;">${item.pdb}</a>`;
    badge.classList.add('active');
    
    // Setup Download Button
    const downloadBtn = document.getElementById('downloadPdbBtn');
    downloadBtn.disabled = false;
    downloadBtn.onclick = async () => {
        downloadBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Downloading...';
        try {
            const response = await fetch(`https://files.rcsb.org/download/${item.pdb}.pdb`);
            if (!response.ok) throw new Error('Network response was not ok');
            const text = await response.text();
            const blob = new Blob([text], { type: 'chemical/x-pdb' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${item.pdb}.pdb`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download PDB file. It might not be available directly.");
        } finally {
            downloadBtn.innerHTML = '<i class="ph ph-download-simple"></i> Download .pdb';
        }
    };
    
    // Hide placeholder
    document.querySelector('.viewer-placeholder').style.opacity = '0';
    document.querySelector('.viewer-placeholder').style.pointerEvents = 'none';
    
    // Update Details section
    const detailsDiv = document.getElementById('viewerDetails');
    detailsDiv.innerHTML = `
        <h3>Nanobody Sequence</h3>
        <div class="sequence-box">${item.sequence || 'No sequence available.'}</div>
    `;
    
    // Load structure dynamically from RCSB PDB
    loadStructure(item.pdb);
}

// Fetch and render the PDB file dynamically using Molstar
function loadStructure(pdbCode) {
    const viewerContainer = document.getElementById('molViewer');
    
    // Clear previous viewer content if any
    viewerContainer.innerHTML = '';
    
    const options = {
        moleculeId: pdbCode.toLowerCase(),
        expanded: false,
        hideControls: false,
        hideCanvasControls: false,
        subscribeEvents: true,
        bgColor: {r: 15, g: 23, b: 42}, // Match our theme #0f172a
        domId: 'molViewer'
    };
    
    viewer.render(viewerContainer, options);
}
