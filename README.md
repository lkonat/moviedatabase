# Actor Database Project

## Description
**Actor Database** is a searchable database where the admin can have many people enter profiles, pictures, and resumes for future searching. Similar in thought to the IMDB database, its overall goal is to link directors and actors in one database.

### What Actor Database can do?
Actor Database can do the following, so far:
* Enter profile, along with secure password
* In a profile, a user can enter 5 pictures
* A director can then use the internal search to set parameters on such things as height, skills, and location
* A director, which can be an admin and an actor, can then email the list to each user which then sends a link, to the user to view the information the director is looking for, such as for a movie project
* Texting and phone use for profiles is also available
* Administrators can make other users administrators, users don't have the option to make themselves administrators
* The ability to customize the site by customizing the name, the background picture, and even the about page

## Usage</h1> </center>
The Actor Database program is made through collaboration to make a database that actors can register and create a profile. These profiles will then be viewed by directors to be able to make lists of characteristics they are selecting for a role they need. The characteristics are optional but are used for search criteria i.e. Height, Sex, or even vehicle which can be used in a. This was first designed to be used for a liberal arts college, but has advanced the program enough to be tailored enough for any personal database. 
Some features original to this program are: 
* **Make a profile** meaning that up to 4 profile pictures, resume, and chacteristics are set for a profile. These are used for quick search criteria, but available to be looked at in depth.
* **Search** is used by directors to choose criteria that they need for a role. Criteria include setting the minimum and maximum search for a role such as Jacket size, Skills, Sport abilities, or even acting memberships or guilds.
* **Search saved** are used to customize and then re-use the same search at a later time. By searching only a few of the criteria, the search can be used again for a later time for a role. 
* **Search Basket** is used to save the group of profiles used in a certain search. This ability lets the director pick exactly who the search criteria used for a certain project or a cast that was used during a previous movie.
* **Share the search** is an available option to email to the actors chosen, another director, or even added on email addresses. The option is also available to text. This option sends a link to the email address or text number and then the email uses a system saved token to take them to the search criteria given. 

### Solution
A solution to have actors and directors use a system for a basic resume which had a distant concept like other popular movie databases. Using to bring actors and directors together, it was presented as a web application project and then developed beyond what was asked in the initial presentation.

## What's Next
In the future, the Actor Database will be able to do the following:
* Improved analytics to help improve the search for suggested roles
* Collaborate with other acting guilds or outside agencies
* Presentation of Trailers for the actors involved in the database
* and more...

## Contributors
* Lassana Konate
* Foussini Konate
* Tanner Campbell
* Alex Schaffer
* Matthew Alexander

## Contribute
The first step is to fork this repository by clicking the `Fork` button at the top of [this page](https://github.com/markvoortman/actordatabase) on the right. This will allow you to make changes and eventually you can create pull requests from your forked repository back into this one. After forking, make sure you have a projects directory under your home directory in your jail:
```
mkdir -p ~/projects
```
And change into this directory:
```
cd ~/projects
```
Then simply clone the forked repository:
```
git clone git@github.com:$USERNAME/actordatabase.git
```
Make sure to replace $USERNAME with your own GitHub username, since that is where the forked repository should live.

You will need development credentials to run the code. Please email [mvoortman@pointpark.edu](mailto:mvoortman@pointpark.edu) to obtain them. Once received, simply put the `credentials.js` file in the main directory and run:
```
node index.js
```
Note that not all functionality may work. If `node` is not installed, please follow [this tutorial](https://it.pointpark.edu/tutorials/node/).

If you make some changes and would like to contribute them back, please create a pull request to the original repository. Thank you in advance!
