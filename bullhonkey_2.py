def filter_jobs(input_file, output_file):
    """
    Reads an input file, filters lines based on specific keywords,
    and writes the matching lines to an output file.
    
    Args:
        input_file (str): The name of the input file (e.g., 'every_job.txt').
        output_file (str): The name of the output file (e.g., 'every_job_filtered.txt').
    """
    
    keywords = ['enterprise_services', 'edp', 'esi', 'di_', 'edw']
    
    try:
        with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
            for line in infile:
                # Convert the line to lowercase for case-insensitive comparison
                lowercase_line = line.lower()
                
                # Check if the line contains any of the keywords
                if any(keyword in lowercase_line for keyword in keywords):
                    # Write the original line (with its original casing) to the output file
                    outfile.write(line)
        print(f"✅ Successfully filtered lines from '{input_file}' and saved to '{output_file}'.")
    except FileNotFoundError:
        print(f"❌ Error: The file '{input_file}' was not found. Please make sure it exists in the same directory.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

# Specify the input and output file names
input_file_name = 'every_job.txt'
output_file_name = 'every_job_filtered.txt'

# Run the function
filter_jobs(input_file_name, output_file_name)